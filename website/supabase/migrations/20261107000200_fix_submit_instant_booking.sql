-- ===========================================================================
-- CAGESPORTS INSTANT BOOKING FUNCTION FIX
-- Migration: 20261107000200_fix_submit_instant_booking.sql
--
-- Replaces public.submit_instant_booking() with valid standard SQL expressions
-- for trim() and nullif() under search_path = ''.
-- Preserves SECURITY DEFINER, postgres ownership, Asia/Kolkata timezone,
-- input validations, atomic race-condition prevention, and execute grants.
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
  v_clean_name        := nullif(trim(p_customer_name), '');
  v_clean_phone       := nullif(trim(p_customer_phone), '');
  v_clean_team        := nullif(trim(p_team), '');
  v_clean_notes       := nullif(trim(p_notes), '');
  v_clean_custom_time := nullif(trim(p_custom_time), '');

  -- Validate field lengths and formats
  if v_clean_activity is null or char_length(v_clean_activity) > 80 then
    raise exception 'invalid_activity' using errcode = '22023';
  end if;

  if v_clean_name is null or char_length(v_clean_name) > 120 then
    raise exception 'invalid_customer_name' using errcode = '22023';
  end if;

  if v_clean_phone is null or v_clean_phone !~ '^[0-9+ -]{10,16}$' then
    raise exception 'invalid_customer_phone' using errcode = '22023';
  end if;

  if v_clean_team is not null and char_length(v_clean_team) > 120 then
    raise exception 'invalid_team' using errcode = '22023';
  end if;

  if v_clean_notes is not null and char_length(v_clean_notes) > 500 then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;

  -- Both standard bookings and custom-time inquiries require a valid calendar date
  if p_booking_date is null then
    raise exception 'booking_date_required' using errcode = '22023';
  end if;

  -- Ensure booking date is not in the past relative to the arena timezone
  if p_booking_date < v_arena_today then
    raise exception 'booking_date_in_past' using errcode = '22023';
  end if;

  -- Reject ambiguous combinations (supplying both standard slot and custom time)
  if p_slot_start is not null and v_clean_custom_time is not null then
    raise exception 'ambiguous_time_selection' using errcode = '22023';
  end if;

  -- Reject incomplete combinations (supplying neither standard slot nor custom time)
  if p_slot_start is null and v_clean_custom_time is null then
    raise exception 'time_window_required' using errcode = '22023';
  end if;

  -- Workflow differentiation: standard slot vs custom-time inquiry
  if p_slot_start is not null then
    -- On the current date, reject slots that have already started or passed in IST
    if p_booking_date = v_arena_today and p_slot_start <= v_arena_time then
      raise exception 'booking_slot_in_past' using errcode = '22023';
    end if;

    -- Standard valid slot: confirmed immediately
    v_status := 'confirmed';
    v_decided_at := pg_catalog.now();
  else
    -- Custom-time inquiry: validate note length
    if char_length(v_clean_custom_time) > 120 then
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
