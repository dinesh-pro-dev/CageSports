-- Cage Sports – shared booking workflow
--
-- Run this whole file once against the Supabase project (SQL Editor → paste → Run,
-- or `supabase db push`). See ../../README.md for the full setup steps.
--
-- Who can do what (enforced here, not in the browser):
--   visitors (anon)   – insert a request (always "pending"); read booked date/time pairs only
--   organizers        – read every request; confirm / decline / cancel through
--                       decide_booking_request()
--   everyone else     – signed-in users who are not in public.organizers get nothing extra

-- ---------------------------------------------------------------------------
-- Organizers: the Supabase Auth users allowed to manage bookings.
-- Rows are added by hand in the SQL editor (see README); nobody can add
-- themselves through the API.
-- ---------------------------------------------------------------------------
create table public.organizers (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.organizers enable row level security;

revoke all on table public.organizers from anon, authenticated;
grant select on table public.organizers to authenticated;

create policy "Organizers can read their own membership"
  on public.organizers for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Used by the policies below. SECURITY DEFINER so it can look the caller up
-- without opening the organizers table to anyone else.
create function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizers o where o.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_organizer() from public, anon;
grant execute on function public.is_organizer() to authenticated;

-- ---------------------------------------------------------------------------
-- Booking requests: what customers submit. Contains contact details, so it is
-- never readable by the public.
-- ---------------------------------------------------------------------------
create table public.booking_requests (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  status         text not null default 'pending',
  activity       text not null,
  booking_date   date,          -- arena-local calendar date; null = "to be discussed"
  slot_start     time,          -- start of the one-hour window; null = custom / to be discussed
  custom_time    text,          -- free-text window typed by the customer
  customer_name  text not null,
  customer_phone text not null,
  team           text,
  notes          text,
  decided_at     timestamptz,
  decided_by     uuid references auth.users (id) on delete set null,

  constraint booking_requests_status_valid
    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  -- A confirmed booking always occupies a concrete date and window.
  constraint booking_requests_confirmed_has_slot
    check (status <> 'confirmed' or (booking_date is not null and slot_start is not null)),
  constraint booking_requests_activity_length       check (char_length(activity) between 1 and 80),
  constraint booking_requests_customer_name_length  check (char_length(customer_name) between 1 and 120),
  constraint booking_requests_customer_phone_format check (customer_phone ~ '^[0-9+ -]{10,16}$'),
  constraint booking_requests_custom_time_length    check (custom_time is null or char_length(custom_time) <= 120),
  constraint booking_requests_team_length           check (team is null or char_length(team) <= 120),
  constraint booking_requests_notes_length          check (notes is null or char_length(notes) <= 500)
);

-- The double-booking guard: at most one confirmed request per date + window.
-- A unique index is checked by the database itself, so it also holds when two
-- confirmations arrive at the same moment.
create unique index booking_requests_one_confirmed_per_slot
  on public.booking_requests (booking_date, slot_start)
  where status = 'confirmed';

create index booking_requests_status_created_idx
  on public.booking_requests (status, created_at desc);

alter table public.booking_requests enable row level security;

-- Column-level privileges: visitors may only supply the request fields, so
-- status / decided_* always take their defaults ("pending", null).
revoke all on table public.booking_requests from anon, authenticated;
grant insert (activity, booking_date, slot_start, custom_time, customer_name, customer_phone, team, notes)
  on table public.booking_requests to anon, authenticated;
grant select on table public.booking_requests to authenticated;
grant update (status, booking_date, slot_start, decided_at, decided_by)
  on table public.booking_requests to authenticated;

create policy "Anyone can submit a pending request"
  on public.booking_requests for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and decided_at is null
    and decided_by is null
    -- one day of slack for visitors whose clock is behind the server's (UTC) date
    and (booking_date is null or booking_date >= current_date - 1)
  );

create policy "Organizers can read all requests"
  on public.booking_requests for select
  to authenticated
  using ((select public.is_organizer()));

create policy "Organizers can decide requests"
  on public.booking_requests for update
  to authenticated
  using ((select public.is_organizer()))
  with check ((select public.is_organizer()));

-- No delete policy: requests are kept as a record.

-- ---------------------------------------------------------------------------
-- Booked slots: the only booking data the public can read – a date and a start
-- time, nothing about the customer. Maintained by a trigger so it always
-- mirrors the confirmed requests.
-- ---------------------------------------------------------------------------
create table public.booked_slots (
  booking_date date not null,
  slot_start   time not null,
  request_id   uuid not null unique references public.booking_requests (id) on delete cascade,
  primary key (booking_date, slot_start)
);

alter table public.booked_slots enable row level security;

revoke all on table public.booked_slots from anon, authenticated;
grant select (booking_date, slot_start) on table public.booked_slots to anon, authenticated;

create policy "Anyone can see which slots are booked"
  on public.booked_slots for select
  to anon, authenticated
  using (booking_date >= current_date - 1);

-- No insert / update / delete policies: only the trigger below writes here.

create function public.sync_booked_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'confirmed' then
    delete from public.booked_slots where request_id = old.id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.status = 'confirmed' then
    insert into public.booked_slots (booking_date, slot_start, request_id)
    values (new.booking_date, new.slot_start, new.id);
  end if;

  return null;
end;
$$;

revoke all on function public.sync_booked_slot() from public, anon, authenticated;

create trigger booking_requests_sync_booked_slot
  after insert or update or delete on public.booking_requests
  for each row execute function public.sync_booked_slot();

-- ---------------------------------------------------------------------------
-- Organizer decisions. Runs with the caller's own permissions (SECURITY
-- INVOKER), so the row-level policies above still apply.
--
--   p_decision = 'confirmed'  pending   → confirmed (slot becomes booked)
--                'declined'   pending   → declined
--                'cancelled'  confirmed → cancelled (slot is released)
--
-- p_booking_date / p_slot_start let the organizer set or correct the date and
-- window while confirming (needed when the customer typed a custom window).
--
-- Error messages are stable identifiers the organizer page translates:
--   not_authorized, invalid_decision, request_not_found, request_already_decided,
--   request_not_confirmed, date_and_slot_required, slot_already_booked
-- ---------------------------------------------------------------------------
create function public.decide_booking_request(
  p_request_id   uuid,
  p_decision     text,
  p_booking_date date default null,
  p_slot_start   time default null
)
returns public.booking_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row  public.booking_requests;
  v_date date;
  v_slot time;
begin
  if not public.is_organizer() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('confirmed', 'declined', 'cancelled') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  -- Lock the request so two clicks on the same request are handled one at a time.
  select * into v_row
  from public.booking_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if p_decision = 'cancelled' then
    if v_row.status <> 'confirmed' then
      raise exception 'request_not_confirmed' using errcode = 'P0001';
    end if;

    update public.booking_requests
    set status = 'cancelled', decided_at = now(), decided_by = (select auth.uid())
    where id = p_request_id
    returning * into v_row;
    return v_row;
  end if;

  if v_row.status <> 'pending' then
    raise exception 'request_already_decided' using errcode = 'P0001';
  end if;

  if p_decision = 'declined' then
    update public.booking_requests
    set status = 'declined', decided_at = now(), decided_by = (select auth.uid())
    where id = p_request_id
    returning * into v_row;
    return v_row;
  end if;

  v_date := coalesce(p_booking_date, v_row.booking_date);
  v_slot := coalesce(p_slot_start, v_row.slot_start);

  if v_date is null or v_slot is null then
    raise exception 'date_and_slot_required' using errcode = 'P0001';
  end if;

  begin
    update public.booking_requests
    set status = 'confirmed',
        booking_date = v_date,
        slot_start = v_slot,
        decided_at = now(),
        decided_by = (select auth.uid())
    where id = p_request_id
    returning * into v_row;
  exception
    when unique_violation then
      -- Another request already holds this date + window. If the other
      -- confirmation is still in flight, the database waits for it to finish
      -- and then lands here, so exactly one of the two wins.
      raise exception 'slot_already_booked' using errcode = '23505';
  end;

  return v_row;
end;
$$;

revoke all on function public.decide_booking_request(uuid, text, date, time) from public, anon;
grant execute on function public.decide_booking_request(uuid, text, date, time) to authenticated;
