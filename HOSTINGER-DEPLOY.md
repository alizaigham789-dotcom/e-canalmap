# E-canal Map — Hostinger Deployment Guide

This guide produces a single `dist.zip` you can upload to Hostinger's
Web Apps / File Manager. The build must be run **locally** (the builder
environment cannot run `npm run build` or create zips for you).

---

## 0. Prerequisites

- Node.js **18+** installed locally (`node -v`).
- This project folder on your machine.
- A Hostinger hosting plan on an **Apache** server with:
  - `mod_rewrite`, `mod_proxy`, `mod_proxy_http` enabled
    (Hostinger's shared plans have these by default).
  - If `mod_proxy` is unavailable on your plan, see
    **Fallback (DNS pointing)** at the bottom.

---

## 1. Build the production bundle

From the project root:

```bash
npm ci
npm run build
```

Before building, copy `.env.example` to `.env.local` and confirm these values:

```dotenv
VITE_APP_BACKEND=base44
VITE_BASE44_APP_ID=your_base44_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

The Base44 app URL is used for authentication and app metadata. API data calls
are routed through the same-origin `/api` proxy in `public/.htaccess`. Do not
put private API keys in `VITE_*` variables: Vite exposes them to end users.

This creates a `dist/` folder containing the entire compiled app:
- `index.html`
- `assets/` (hashed JS/CSS chunks)
- `manifest.json`, `sw.js`, favicon, etc.
- **`.htaccess`** (copied from `public/.htaccess`) — this is what makes
  SPA routing + the Base44 API proxy work on Hostinger.

After building, verify that `dist/.htaccess` exists before creating the zip.

> The `.htaccess` proxies every `/api/*` request to
> `https://e-canal-map-91122b25.base44.app/api/*`, so the app talks to
> the Base44 backend through your Hostinger domain (no CORS, auth stays
> on your domain).

---

## 2. Create the zip

Zip the **contents** of `dist/` (not the `dist` folder itself), so
`index.html` and `.htaccess` sit at the zip's root:

### macOS / Linux
```bash
cd dist
zip -r ../ecanal-map-hostinger.zip . -x ".*"
# NOTE: dotfiles like .htaccess are excluded by -x ".*" above.
# Include it explicitly:
zip ../ecanal-map-hostinger.zip .htaccess
cd ..
```

### Windows (PowerShell)
```powershell
Compress-Archive -Path dist\* -DestinationPath ecanal-map-hostinger.zip
# PowerShell's Compress-Archive skips hidden files, so add .htaccess manually
# after creating the zip, OR use 7-Zip / WinRAR which include hidden files.
```

> **Important:** whatever tool you use, make sure `.htaccess` is inside
> the zip at the root level. 7-Zip and WinRAR include hidden files by
> default — PowerShell's `Compress-Archive` does **not**.

---

## 3. Upload to Hostinger

### Option A — File Manager (simplest)
1. Log in to **hPanel** → **Files** → **File Manager**.
2. Open the folder for your domain (usually `public_html`), or a
   subfolder if you set the domain's document root there.
3. **Empty** the target folder first (delete any old `index.html`,
   `assets/`, default Hostinger page).
4. Click **Upload** → choose `ecanal-map-hostinger.zip`.
5. Right-click the zip → **Extract** → extract into the current folder.
6. Delete the zip after extraction.
7. Confirm `.htaccess` is present (File Manager may hide dotfiles —
   enable "Show hidden files" in its settings).

### Option B — Web Apps deployment
1. **hPanel** → **Website** → **Web Apps** (if available on your plan).
2. Create a new web app / deployment.
3. Upload the zip when prompted, or pull from a Git repo containing
   the built `dist/` output.
4. Set the document root to the extracted folder.

---

## 4. Verify

- Visit `https://your-domain.tld/` — the login/dashboard should load.
- Open browser DevTools → **Network**. Refresh and confirm that
  `/api/apps/public/...` requests return **200** (proxied to Base44)
  and are **not** 404.
- Test a deep route like `https://your-domain.tld/geo-map` — it must
  load (SPA fallback), not 404.
- Log in — the auth redirect should stay on your domain.
- Confirm the browser is using the intended backend in the built app; a
   Hostinger deployment must be built with `VITE_APP_BACKEND=base44`.

---

## 5. Troubleshooting

### API calls return 404 (app loads but login/data fail)
`mod_proxy` is likely disabled on your hosting plan. The `.htaccess`
includes a `<IfModule mod_proxy_http.c>` guard so the site still loads,
but `/api/*` won't be proxied. Two fixes:
  1. Ask Hostinger support to enable `mod_proxy` + `mod_proxy_http`
     (or move to a VPS / Premium plan where they're guaranteed).
  2. Use the **DNS pointing** fallback below.

### Deep links 404 on refresh
`mod_rewrite` is off. In hPanel, ensure **Apache** is the web server and
that `.htaccess` overrides are allowed (they are by default on Hostinger).

### Blank page / assets 404
You uploaded the `dist` *folder* instead of its *contents*. Re-extract so
`index.html` and `.htaccess` are directly in `public_html`.

### `.htaccess` not visible after extraction
Enable **Show hidden files** in File Manager settings. The file ships in
the zip — it's just hidden.

---

## Fallback: DNS pointing (if mod_proxy is unavailable)

If Hostinger can't proxy `/api/*`, the simplest reliable option is to
point your domain at the Base44 app via DNS:

1. **hPanel** → **Domains** → your domain → **DNS** / **Nameservers**.
2. Add a **CNAME** record:
   - **Name / Host:** `@` (or `www`)
   - **Target:** `e-canal-map-91122b25.base44.app`
3. In the Base44 builder, add your custom domain under
   **Settings → Custom Domains** and verify it.
4. Remove the Hostinger hosting — the CNAME serves the Base44 app
   directly at your domain, with the API on the same origin.

This needs no build/zip at all: Base44 serves the app for you.

---

## What's in the zip (expected structure)

```
ecanal-map-hostinger.zip
├── .htaccess              ← SPA routing + API proxy
├── index.html
├── manifest.json
├── sw.js
├── favicon / icons
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── ... (hashed chunks)
``