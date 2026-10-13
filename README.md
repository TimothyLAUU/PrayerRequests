# MCAC Prayer Wall

A simple React + TypeScript + Vite website with prayer requests, optional names, and pastel cards, ready for Supabase and GitHub Pages.

## Run locally

Install Node.js 22 LTS, then run in this folder:

```sh
npm install
npm run dev
```

Open the URL printed in the terminal (normally http://localhost:5173). Stop with Ctrl+C.

Without Supabase settings, you get a labeled demo with three example prayers. Demo requests are stored only in this browser. They are never uploaded to Supabase.

## Connect Supabase

You do **not** need to connect your GitHub repository to Supabase. This app connects directly using the project URL and publishable key. Supabase's optional GitHub integration is for database deployment/branching workflows, not for hosting this React website.

1. Send your colleague `supabase/schema.sql`. They should run it once in the project's **SQL Editor**. It creates the table and public read/insert policies. If they already made a table, agree on this schema first.
2. Ask for the **project URL** and **publishable key** from the project's Connect dialog / API settings. A legacy `anon` key also works. Never use a secret or `service_role` key in this website.
3. Copy the example configuration:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Edit `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

5. Restart `npm run dev`. The demo banner disappears. Add a request and open the page in another browser to verify the shared wall. Click **Refresh** to fetch other visitors' new requests; this version does not use realtime subscriptions.

The app reads `id`, `message`, `name`, `created_at` from `public.prayer_requests` and inserts `message` and an optional `name` (up to 80 characters). Blank names are saved as NULL and shown as Anonymous. The database creates IDs and timestamps. The newest 200 prayers are shown; older requests remain stored. On failure, check the configuration, table, and policies. Failed submissions keep the entered text and name.

### Existing database: add optional names

Run `supabase/add-name.sql` in Supabase SQL Editor **before deploying this app update**. This adds the nullable name column and permission to submit it. Existing prayers stay anonymous. Do not rerun the full `schema.sql` on an existing database. Then push the app changes and let Netlify redeploy; no new environment variables are needed.

## Events

For an existing database, run `supabase/add-events.sql` in the Supabase SQL Editor before deploying this version (apply `add-name.sql` first if names have not been added). New databases use `schema.sql`. No database migration has been applied automatically.

In the Supabase Table Editor, add a row to `fellowship_events` with your gathering's title, date, and `is_current` set to true. Only one event can be current. At your next gathering, set the previous event's `is_current` to false, then create the new current event. Visitors can read events but cannot create or change them.

The wall defaults to **This event**. Past events are available in the Gathering filter, and existing unassigned requests are under **Earlier prayers (no event)**. The add-prayer popup always uses the current event, even when browsing an older one. If no event is current, posting is disabled. Each event loads its newest 200 requests separately. The demo uses example events and browser-only storage.

Search checks names and request text, ignoring case. All search words must match. Filters offer named/anonymous requests, the last 7 or 30 days, and newest/oldest sorting. They apply to the selected gathering's newest 200 loaded prayers. Clear filters resets these controls while keeping the selected gathering. No additional database migration is needed for search or filters.

## Event name on prayer requests

Before deploying this version, run `supabase/add-event-name.sql` after the events migration. This is safe if you already added the `event_name` text column manually. The app submits the current event's ID and title with each prayer; a database trigger derives the stored title from the linked event so stale or incorrect client names cannot be stored. Existing linked prayers are backfilled, while unassigned prayers are left untouched.

`event_id` remains the relationship used for filtering. `event_name` records the title when the prayer is submitted; later event renames do not rewrite this historical title automatically. New installations run `add-event-name.sql` after `schema.sql` as well.

## Organiser event manager

1. Run `supabase/add-event-admins.sql` in the SQL Editor after the events migration. New databases also run this after `schema.sql`.
2. In Supabase **Authentication → Users**, create an email/password account for each organiser (or use their existing account). Ensure the account can sign in and its email is confirmed. No public signup is provided in the app.
3. Copy the account's user UUID and run this in the SQL Editor, replacing the placeholder:

   ```sql
   insert into public.event_admins (user_id)
   values ('YOUR_AUTH_USER_UUID') on conflict do nothing;
   ```

4. Deploy the updated app, click **Organiser sign-in**, and use that account. Approved organisers see **Manage events**, where they can create and edit gatherings and choose the current event. Switching events preserves all prayer requests.

Only the dashboard/SQL Editor can add or remove admin membership. Remove access by deleting the organiser's `event_admins` row. Signing in alone does not grant admin access. All event writes go through an RPC that verifies membership on every call; anonymous users cannot call it, and signed-in non-admins are rejected. No service-role key or admin password is embedded in the website.

`supabase/test-event-admins.sql` checks permissions, rejection, event switching, and revocation in a transaction that rolls back its fixtures. Run it in SQL Editor after applying the migration; it has not been run against your hosted database automatically.

## Deploy to GitHub Pages

1. Commit and push the files, including `package-lock.json`, to `main` or `master`. `.env.local` is ignored by Git.
2. In the GitHub repository, open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Under **Settings → Secrets and variables → Actions → Variables**, create repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the same values as your local settings.
4. Open **Actions → Deploy prayer wall to GitHub Pages → Run workflow**, or push another commit. The successful deployment provides your URL.

Deploying without settings gives you the labeled demo. After adding/changing variables, rerun the workflow: these values are embedded at build time. Local environment settings do not configure GitHub Pages.

GitHub Pages hosts the React files; Supabase stores the shared requests. Publishable browser keys are intentionally public; database policies control access. Visitors can read and submit, but cannot edit or delete prayers. Your colleague can remove requests from the Supabase Table Editor. This first version has no moderation queue or spam protection; add these before promoting a widely accessible public wall.

## Build

`npm run typecheck` checks TypeScript without building. The production build also runs this check automatically.

```sh
npm run build
npm run preview
```

Production files go in `dist/`. Relative asset paths support GitHub Pages repository subfolders.

References: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html).
