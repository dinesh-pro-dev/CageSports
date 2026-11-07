# Cage Sports (Seerapalayam) website

Responsive static site built from the Stitch mobile exports in the parent folder
(`../home_mobile_revised`, `../gallery_mobile_revised`, `../book_slot_mobile_revised`)
and the tokens in `../cage_sports_arena/DESIGN.md`. The exports are reference only and
are not loaded by the site.

## Pages

| File           | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `index.html`   | Home (from `home_mobile_revised`)                              |
| `gallery.html` | Gallery (from `gallery_mobile_revised`)                        |
| `book.html`    | Book Slot (from `book_slot_mobile_revised`)                    |
| `404.html`     | "Page not found" page with links to Home, Gallery and Book Slot. Uses root-absolute paths (`/assets/…`) because hosts serve it at any missing address. |

The mobile layouts follow the exports. From 768px the bottom tab bar is replaced by
the header nav and sections move to multi-column grids; content is capped at 1440px.

## Search and sharing

- Each public page has its own title, description, canonical URL and Open Graph / Twitter
  preview tags. The preview tags repeat the page's title and description – change them together.
- `sitemap.xml` lists the public pages; `robots.txt` points to it. `404.html`
  carries a `noindex` tag and is left out of the sitemap.
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
- `assets/js/booking-data.js` – slot windows + Supabase connection for customer booking
- `assets/js/booking.js` – activity / calendar / time-slot picker, instant slot reservation, WhatsApp hand-off
- `assets/js/config.js` – **generated** from environment variables, not committed
- `assets/vendor/supabase.js` – Supabase browser client, copied from `node_modules` by the build
- `assets/img/` – local copies of the export images (640w and 1200w) and the logo
- `scripts/build-config.mjs` – writes `config.js`; refuses secret keys
- `supabase/migrations/` – database schema, permissions and booking rules

## Themes

Dark is the default; the sun / moon button at the top right of every page's header switches to
light and back. The choice is saved in the browser (`localStorage`, key `cage-sports-theme`) and
applies to every page.

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

1. A customer fills in the Book Slot form on `/book.html` (selecting activity, date, and preferred time slot).
2. The slot is immediately confirmed and reserved in Supabase via the secure `submit_instant_booking()` function.
3. The confirmed booking is automatically synchronized to `public.booked_slots`, instantly marking that date + time slot as **Booked** for all visitors.
4. Only one booking can be confirmed per date + slot. The database enforces this atomically with the unique partial index `booking_requests_one_confirmed_per_slot`. If two customers submit the same slot simultaneously, exactly one succeeds and the other receives a friendly conflict notice.
5. WhatsApp click-to-chat opens with the pre-filled booking details. The customer presses Send to notify the arena desk.

If the request cannot be saved (e.g. offline, connection failure), the customer sees "Request Not Saved", WhatsApp is not opened automatically, and nothing claims the booking was recorded.

### Who can see what

Permissions live in the database (row-level security + column privileges in the migration), not in the page code:

| Role                 | Can do                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Visitor (public key) | Submit a booking via `submit_instant_booking()`. Read booked **date + start time** only. |

Customer names, phone numbers, teams and notes are strictly protected by Row-Level Security and are never readable with the public anon key.

## Supabase setup

Until these steps are done the site is **not connected**: the Book Slot page reports that requests cannot be saved.

1. **Create a project** at <https://supabase.com/dashboard> (any region; note the database password somewhere safe – the site itself never needs it).

2. **Run the migrations.** In the Supabase Dashboard → **SQL Editor** → New query:
   - Run `supabase/migrations/20261002000000_booking_workflow.sql`
   - Run `supabase/migrations/20261106000100_instant_booking.sql`

3. **Add the keys to the site.** Copy `.env.example` to `.env` and fill in, from Dashboard → **Project Settings → API**:

   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<the "anon" / "publishable" key>
   ```

   Use the **public** key only. The `service_role` / secret key must never be used here; `scripts/build-config.mjs` stops with an error if it detects one.

4. **Build the configuration.** Run:

   ```sh
   node scripts/build-config.mjs
   ```

   This generates `assets/js/config.js` with `window.CAGE_SPORTS_CONFIG`.

5. **Check it.** Submit a test booking on `/book.html` – the slot should show **Booked** immediately for subsequent visitors, and WhatsApp will open with the pre-filled message for the desk.

### Notes

- `.env` and `assets/js/config.js` are git-ignored. The public key is safe to ship to browsers (it is designed for that); access is limited by PostgreSQL RLS policies and database constraints.
- Dates and slot times are validated relative to the arena's local timezone (`Asia/Kolkata`, IST).
- The WhatsApp number that receives booking notifications is set in `assets/js/booking.js` (`918056752258`).
