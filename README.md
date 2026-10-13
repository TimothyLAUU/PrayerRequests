# MCAC Prayer Wall

A simple React + TypeScript + Vite website with anonymous prayer requests and pastel cards, ready for Supabase and GitHub Pages.

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

For an existing database, run `supabase/migrations/20261013_add_prayer_name.sql` in the Supabase SQL Editor before using this version. It adds the optional name field and permits visitors to submit it. New installations use the updated `supabase/schema.sql` instead.

The app reads `id`, `message`, `name`, `created_at` from `public.prayer_requests` and inserts `message` and `name`. Staying anonymous always sends a null name, even if a name was entered before switching back. Existing prayers remain anonymous. Names are limited to 60 characters and are displayed in prayer cards and the list. The database creates IDs and timestamps. The newest 200 prayers are shown; older requests remain stored. On failure, check the configuration, table, and policies. Failed submissions keep the entered text and name.

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
