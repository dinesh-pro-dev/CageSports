-- ===========================================================================
-- CAGESPORTS COMPREHENSIVE CUSTOMER INPUT VALIDATION
-- Migration: 20261107000300_customer_input_validation.sql
--
-- Replaces public.submit_instant_booking() with enhanced validation:
-- 1. Full name: 2-80 chars, requires at least one Unicode letter, allows
--    letters, combining marks, single spaces, and internal hyphens/apostrophes
--    (e.g. Mary-Jane, O'Connor). Rejects digits, symbols, emojis, control
--    characters, and standalone combining marks.
-- 2. Activity: validates against exact customer-facing activity whitelist (7 items).
-- 3. Phone: exactly 10 digits, starts with 6, 7, 8, or 9.
-- 4. Team: optional, max 80 chars, alphanumeric + hyphens + apostrophes.
-- 5. Notes: optional, max 500 chars, no control characters.
-- 6. Custom time: optional, 3-120 chars, legitimate time window format.
--
-- Preserves SECURITY DEFINER, postgres ownership, Asia/Kolkata timezone,
-- search_path = '', double-booking protection, and least-privilege grants.
-- ===========================================================================

create or replace function public.submit_instant_booking(
  p_activity       text,
  p_booking_date   date default null,
  p_slot_start     time default null,
  p_custom_time    text default null,
  p_customer_name  text default null,
  p_customer_phone text default null,
  p_team           text default null,
  p_notes          text default null
)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_decided_at timestamptz;
  v_id uuid;
  v_clean_activity text;
  v_clean_name text;
  v_clean_phone text;
  v_clean_team text;
  v_clean_notes text;
  v_clean_custom_time text;
  v_arena_today date;
  v_arena_time time;
  v_constraint text;
begin
  -- Determine current date and time in the arena's local timezone (Coimbatore, India)
  v_arena_today := (pg_catalog.timezone('Asia/Kolkata', pg_catalog.now()))::date;
  v_arena_time  := (pg_catalog.timezone('Asia/Kolkata', pg_catalog.now()))::time;

  -- Sanitize text inputs using standard SQL expressions
  v_clean_activity    := nullif(trim(p_activity), '');
  v_clean_name        := nullif(pg_catalog.regexp_replace(trim(p_customer_name), '\s+', ' ', 'g'), '');
  v_clean_phone       := nullif(trim(p_customer_phone), '');
  v_clean_team        := nullif(pg_catalog.regexp_replace(trim(p_team), '\s+', ' ', 'g'), '');
  v_clean_notes       := nullif(trim(p_notes), '');
  v_clean_custom_time := nullif(pg_catalog.regexp_replace(trim(p_custom_time), '\s+', ' ', 'g'), '');

  -- 1. Validate activity against the exact frontend whitelist (7 supported activities)
  if v_clean_activity is null or v_clean_activity not in (
    '5 a-side football',
    '6 a-side football',
    '7 a-side football',
    'Indoor cricket',
    'Softball batting cage',
    'Birthday parties (Inquiry)',
    'Corporate & school events (Inquiry)'
  ) then
    raise exception 'invalid_activity' using errcode = '22023';
  end if;

  -- 2. Validate customer name: required, 2-80 chars
  -- Single-line regex expression with no embedded line breaks or indentation.
  -- Requires at least one Unicode letter (rejects standalone combining marks).
  -- Positively permits Unicode letters, combining marks, single spaces, and internal hyphens/apostrophes (e.g. Mary-Jane, O'Connor).
  -- Rejects digits, control characters, emojis, symbols, and other punctuation.
  if v_clean_name is null or char_length(v_clean_name) < 2 or char_length(v_clean_name) > 80 or v_clean_name ~ '^ | $' or v_clean_name ~ '  ' or v_clean_name !~ '[[:alpha:]]' or v_clean_name ~ '[0-9[:cntrl:]]' or v_clean_name ~ '[\U00010000-\U0010FFFF\u2600-\u27BF]' or v_clean_name !~ '^([[:alpha:]\u0300-\u036F\u0901-\u0903\u093A-\u094F\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD\u0B01-\u0B03\u0B3C\u0B3E-\u0B4D\u0B82\u0BBE-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C4D\u0C82-\u0C83\u0CBC\u0CBE-\u0CCD\u0D02-\u0D03\u0D3E-\u0D4D\u0D57]+([-''\u2019][[:alpha:]\u0300-\u036F\u0901-\u0903\u093A-\u094F\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD\u0B01-\u0B03\u0B3C\u0B3E-\u0B4D\u0B82\u0BBE-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C4D\u0C82-\u0C83\u0CBC\u0CBE-\u0CCD\u0D02-\u0D03\u0D3E-\u0D4D\u0D57]+)*)( ([[:alpha:]\u0300-\u036F\u0901-\u0903\u093A-\u094F\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD\u0B01-\u0B03\u0B3C\u0B3E-\u0B4D\u0B82\u0BBE-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C4D\u0C82-\u0C83\u0CBC\u0CBE-\u0CCD\u0D02-\u0D03\u0D3E-\u0D4D\u0D57]+([-''\u2019][[:alpha:]\u0300-\u036F\u0901-\u0903\u093A-\u094F\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD\u0B01-\u0B03\u0B3C\u0B3E-\u0B4D\u0B82\u0BBE-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C4D\u0C82-\u0C83\u0CBC\u0CBE-\u0CCD\u0D02-\u0D03\u0D3E-\u0D4D\u0D57]+)*))*$' then
    raise exception 'invalid_customer_name' using errcode = '22023';
  end if;

  -- 3. Validate customer phone: required, exactly 10 digits starting with 6, 7, 8, or 9
  if v_clean_phone is null or v_clean_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_customer_phone' using errcode = '22023';
  end if;

  -- 4. Validate team name: optional, max 80 chars, letters, combining marks, numbers, spaces, hyphens, and apostrophes
  if v_clean_team is not null then
    if char_length(v_clean_team) > 80
       or v_clean_team ~ '[[:cntrl:]]'
       or v_clean_team ~ '[\U00010000-\U0010FFFF\u2600-\u27BF]'
       or v_clean_team !~ '^[[:alnum:]\u0300-\u036F\u0901-\u0903\u093A-\u094F\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD\u0B01-\u0B03\u0B3C\u0B3E-\u0B4D\u0B82\u0BBE-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C4D\u0C82-\u0C83\u0CBC\u0CBE-\u0CCD\u0D02-\u0D03\u0D3E-\u0D4D\u0D57 ''\-]+$'
    then
      raise exception 'invalid_team' using errcode = '22023';
    end if;
  end if;

  -- 5. Validate notes: optional, max 500 chars, no control characters except newline and tab
  if v_clean_notes is not null then
    if char_length(v_clean_notes) > 500
       or v_clean_notes ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]'
    then
      raise exception 'invalid_notes' using errcode = '22023';
    end if;
  end if;

  -- 6. Both standard bookings and custom-time inquiries require a valid calendar date
  if p_booking_date is null then
    raise exception 'booking_date_required' using errcode = '22023';
  end if;

  -- 7. Ensure booking date is not in the past relative to the arena timezone
  if p_booking_date < v_arena_today then
    raise exception 'booking_date_in_past' using errcode = '22023';
  end if;

  -- 8. Reject ambiguous combinations (supplying both standard slot and custom time)
  if p_slot_start is not null and v_clean_custom_time is not null then
    raise exception 'ambiguous_time_selection' using errcode = '22023';
  end if;

  -- 9. Reject incomplete combinations (supplying neither standard slot nor custom time)
  if p_slot_start is null and v_clean_custom_time is null then
    raise exception 'time_window_required' using errcode = '22023';
  end if;

  -- 10. Workflow differentiation: standard slot vs custom-time inquiry
  if p_slot_start is not null then
    -- On the current date, reject slots that have already started or passed in IST
    if p_booking_date = v_arena_today and p_slot_start <= v_arena_time then
      raise exception 'booking_slot_in_past' using errcode = '22023';
    end if;

    -- Standard valid slot: confirmed immediately
    v_status := 'confirmed';
    v_decided_at := pg_catalog.now();
  else
    -- Custom-time inquiry: validate format and length (3-120 chars)
    if char_length(v_clean_custom_time) < 3
       or char_length(v_clean_custom_time) > 120
       or v_clean_custom_time ~ '[[:cntrl:]]'
       or v_clean_custom_time !~ '^[a-zA-Z0-9 :.,()\/+\-]+$'
    then
      raise exception 'invalid_custom_time' using errcode = '22023';
    end if;

    -- Inquiry remains pending for arena desk review
    v_status := 'pending';
    v_decided_at := null;
  end if;

  -- Atomically insert the booking request
  begin
    insert into public.booking_requests (
      activity,
      booking_date,
      slot_start,
      custom_time,
      customer_name,
      customer_phone,
      team,
      notes,
      status,
      decided_at,
      decided_by
    )
    values (
      v_clean_activity,
      p_booking_date,
      p_slot_start,
      v_clean_custom_time,
      v_clean_name,
      v_clean_phone,
      v_clean_team,
      v_clean_notes,
      v_status,
      v_decided_at,
      null
    )
    returning id into v_id;

  exception
    when unique_violation then
      -- Inspect the specific constraint/index that triggered the violation
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'booking_requests_one_confirmed_per_slot' then
        raise exception 'slot_already_booked' using errcode = '23505';
      else
        raise;
      end if;
  end;

  return pg_catalog.jsonb_build_object(
    'id', v_id,
    'status', v_status
  );
end;
$$;

-- Explicitly set function owner to postgres
alter function public.submit_instant_booking(text, date, time, text, text, text, text, text) owner to postgres;

-- Set least-privilege execution grants
revoke all on function public.submit_instant_booking(text, date, time, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_instant_booking(text, date, time, text, text, text, text, text) to anon, authenticated;
