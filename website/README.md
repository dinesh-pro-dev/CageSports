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
| `404.html`       | "Page not found" page with links to Home, Gallery and Book Slot. Uses root-absolute paths (`/assets/…`) because hosts serve it at any missing address. |

The mobile layouts follow the exports. From 768px the bottom tab bar is replaced by
the header nav and sections move to multi-column grids; content is capped at 1440px.

## Search and sharing

- Each public page has its own title, description, canonical URL and Open Graph / Twitter
  preview tags. The preview tags repeat the page's title and description – change them together.
- `sitemap.xml` lists the public pages; `robots.txt` points to it. `organizer.html` and
  `404.html` carry a `noindex` tag and are left out of the sitemap.
- **The site address is temporary.** Canonical URLs, preview tags, `sitemap.xml` and
  `robots.txt` need a full address and currently use `https://cagesports.netlify.app`. If the
  site moves to another host or domain, replace it everywhere:

  ```sh
  sed -i 's#https://cagesports.netlify.app#https://www.new-domain.com#g' *.html sitemap.xml robots.txt README.md
  ```

## Structure

- `src/input.css` – Tailwind entry plus the review-ticker styles
- `tailwind.config.js` – design tokens (same names as the exports)
- `assets/css/site.css` – **generated**, do not edit by hand
- `assets/js/site.js` – review ticker (home)
- `assets/js/theme.js` – dark / light theme toggle and persistence (all pages)
- `assets/js/booking-data.js` – slot windows + Supabase connection, shared by the two pages below
- `assets/js/booking.js` – activity / calendar / time-slot picker, saving the request, WhatsApp hand-off
- `assets/js/organizer.js` – organizer sign-in and confirm / decline
- `assets/js/config.js` – **generated** from environment variables, not committed
- `assets/vendor/supabase.js` – Supabase browser client, copied from `node_modules` by the build
- `assets/img/` – local copies of the export images (640w and 1200w) and the logo
- `scripts/build-config.mjs` – writes `config.js`; refuses secret keys
- `supabase/migrations/` – database schema, permissions and booking rules

## Themes

Dark is the default; the sun / moon button at the top right of every page's header switches to
light and back. The choice is saved in the browser (`localStorage`, key `cage-sports-theme`) and
applies to every page, including `/organizer.html`.

- Colours are CSS variables generated in `tailwind.config.js`: `DARK` is the exported
  palette, `LIGHT` lists the values that differ. Edit colours there, then `npm run build`.
- Each page's `<head>` has a one-line script that applies the saved theme before the
  stylesheet loads, so a light-theme visitor never sees a dark flash. Keep it above the
  stylesheet link when adding pages.
- Brand yellow stays as the fill for buttons and selected states in both themes. Where
  yellow is used as text or a thin outline, light theme swaps in a deep gold so it stays
  readable (`accent` / `accent-line` in the config).
- Photos with captions (hero, gallery tiles, featured card) carry `theme-fixed-dark`, which
  keeps their dark scrim and light text in both themes.

## Venue map

The map in the Home and Book Slot location sections is a static image,
`assets/img/venue-map.png` – no map script, iframe or API key. It was stitched once from
OpenStreetMap standard tiles at zoom 13 (wide enough to show the Coimbatore Bypass and the
neighbouring villages) and is centred exactly on the turf
(10.8852326, 76.9746995), so the pin drawn at the centre of the preview is on the venue at
every screen size.

- Map data © OpenStreetMap contributors (ODbL). The "© OpenStreetMap contributors" credit
  on the preview is required by the licence – keep it visible if the section is restyled.
- The whole preview links to the Cage Sports place listing on Google Maps, as does the
  GET DIRECTIONS button. The URL appears twice in each of `index.html` and `book.html`.
- If the venue moves, the image has to be regenerated for the new coordinates.

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
