# E-canal Map

Production-ready Vite/React frontend for cadastral mapping and canal records.

## Local development

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env.local` and set the published Base44 app URL.
3. Run `npm install` and then `npm run dev`.

The default backend is Base44. To use the included Supabase adapter instead,
set `VITE_APP_BACKEND=supabase`, apply `supabase/schema.sql`, and provide the
Supabase URL and publishable key.

## Production build

Run `npm run build`. The generated `dist/` folder is a static deployment and
includes the Apache `.htaccess` file needed for React deep links and the
same-origin `/api` proxy.

For the complete Hostinger upload, domain, and verification procedure, see
`HOSTINGER-DEPLOY.md`.

Never commit `.env`, `.env.local`, or private API keys. Values beginning with
`VITE_` are bundled into browser JavaScript and must be treated as public.
