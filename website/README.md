# Cage Sports (Seerapalayam) website

Responsive static site built from the Stitch mobile exports in the parent folder
(`../home_mobile_revised`, `../gallery_mobile_revised`, `../book_slot_mobile_revised`)
and the tokens in `../cage_sports_arena/DESIGN.md`. The exports are reference only and
are not loaded by the site.

## Pages

| File             | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `index.html`     | Home (from `home_mobile_revised`)                              |
| `gallery.html`   | Gallery (from `gallery_mobile_revised`)                        |
| `book.html`      | Book Slot (from `book_slot_mobile_revised`)                    |
| `organizer.html` | Password-protected bookings page for the arena desk. Not linked from the public navigation – open it directly at `/organizer.html`. |

The mobile layouts follow the exports. From 768px the bottom tab bar is replaced by
the header nav and sections move to multi-column grids; content is capped at 1440px.

## Structure

- `src/input.css` – Tailwind entry plus the review-ticker styles
- `tailwind.config.js` – design tokens (same names as the exports)
- `assets/css/site.css` – **generated**, do not edit by hand
- `assets/js/site.js` – review ticker (home)
- `assets/js/booking-data.js` – slot windows + Supabase connection, shared by the two pages below
- `assets/js/booking.js` – activity / calendar / time-slot picker, saving the request, WhatsApp hand-off
- `assets/js/organizer.js` – organizer sign-in and confirm / decline
- `assets/js/config.js` – **generated** from environment variables, not committed
- `assets/vendor/supabase.js` – Supabase browser client, copied from `node_modules` by the build
- `assets/img/` – local copies of the export images (640w and 1200w) and the logo
- `scripts/build-config.mjs` – writes `config.js`; refuses secret keys
- `supabase/migrations/` – database schema, permissions and booking rules

## Commands

```sh
npm install      # once
npm run build    # writes assets/js/config.js from .env, then rebuilds assets/css/site.css
npm run watch    # rebuild the CSS on change
npm run serve    # http://localhost:4173
```

## How booking works

1. A customer fills in the Book Slot form. The request is saved to Supabase as **pending**,
   and only then does WhatsApp open with the prefilled message for the desk.
2. The organizer signs in at `/organizer.html`, reviews pending requests and presses
   **Confirm** or **Decline**.
3. Confirming marks that date + time slot as **Booked** for every visitor. Pending and
   declined requests never block a slot.
4. Only one request can be confirmed per date + slot. The database enforces this with a
   unique index, so it holds even if two confirmations are sent at the same moment – the
   second is refused and stays pending.
5. A confirmed booking can be cancelled from the Confirmed tab, which frees the slot.

If the request cannot be saved (no connection, Supabase not set up), the customer sees
"Request Not Saved", WhatsApp is not opened automatically, and nothing claims the request
was recorded.

Requests with a custom time window (or no date) are saved without a slot. To confirm one,
the organizer picks the date / slot on the request card; that slot is the one that becomes
booked. A custom window longer than one hour therefore blocks only the single slot chosen.

### Who can see what

Permissions live in the database (row-level security + column privileges in the migration),
not in the page code:

| Role                                     | Can do                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Visitor (public key)                     | Insert a request – always stored as `pending`. Read booked **date + start time** only.   |
| Signed-in account that is not an organizer | Nothing more than a visitor.                                                           |
| Organizer                                | Read all requests incl. contact details; confirm / decline / cancel.                     |

Customer names, phone numbers, teams and notes are never readable with the public key.

## Supabase setup

Until these steps are done the site is **not connected**: the Book Slot page reports that
requests cannot be saved, and `/organizer.html` shows "Bookings Are Not Connected Yet".

1. **Create a project** at <https://supabase.com/dashboard> (any region; note the database
   password somewhere safe – the site itself never needs it).

2. **Run the migration.** Either:
   - Dashboard → **SQL Editor** → New query → paste the whole of
     `supabase/migrations/20261002000000_booking_workflow.sql` → **Run** (run it once, as
     one query), or
   - with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`
     from this folder.

3. **Create the organizer login.** Dashboard → **Authentication → Users → Add user →
   Create new user**. Enter the desk's email and a strong password and tick
   **Auto Confirm User**.

4. **Mark that user as an organizer.** In the SQL Editor run (with the real email):

   ```sql
   insert into public.organizers (user_id)
   select id from auth.users where email = 'desk@example.com';
   ```

   It should report one row inserted. An account that is not in this table can sign in
   but sees no requests.

5. **Turn off public sign-ups** (recommended). Dashboard → **Authentication → Sign In /
   Providers** → disable **Allow new users to sign up**. Self-registered accounts would
   have no access anyway, but there is no reason to allow them.

6. **Add the keys to the site.** Copy `.env.example` to `.env` and fill in, from
   Dashboard → **Project Settings → API**:

   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<the "anon" / "publishable" key>
   ```

   Use the **public** key only. The `service_role` / secret key must never be used here;
   `npm run build` stops with an error if it detects one.

7. **Build and deploy.** Run `npm run build`, then upload the folder as before. If the
   host builds the site for you (Netlify, Vercel, Cloudflare Pages…), set the two
   variables in its dashboard and use `npm run build` as the build command instead of
   committing `.env`.

8. **Check it.** Submit a test request on `/book.html`, sign in at `/organizer.html`,
   confirm it, and reload `/book.html` in a private window – that slot should show
   **Booked**.

### Notes

- `.env` and `assets/js/config.js` are git-ignored. The public key is safe to ship to
  browsers (it is designed for that); what it can do is limited by the policies above.
- Anyone can submit a request, as with any public form. If spam becomes a problem, add
  Supabase's CAPTCHA protection or a rate limit in front of the insert.
- Dates and slot times are stored as plain local values (the arena's calendar date and
  clock time), with no time-zone conversion.
- The WhatsApp number that receives requests is set in `assets/js/booking.js`.
- To remove an organizer: `delete from public.organizers where user_id = '<uuid>';`
