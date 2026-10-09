# WEIDE Brake Fluid Service Record

Mobile-first app for WEIDE Luxury Brake Fluid / Brake Oil replacement records.
Target repository: **Jaylene01/brake-service-record**.

## Features

- Customer name, WhatsApp, vehicle plate, make/model and service mileage/date.
- Fluid type (DOT 3 / DOT 4 / DOT 5.1 / Other).
- Next change date: selected 12 / 18 / 24 month interval, clamped to the last day of the target month.
- Next mileage: current mileage + selected interval (default 40,000 km).
- Date or mileage, whichever comes first; settings are editable workshop intervals.
- Internal `WDBF-YYYYMMDD-NNN` record number, searchable history and customer service card.
- WhatsApp message addressed to the customer's supplied number (blank number opens WhatsApp recipient selection). Clicking opens a draft; it does not send automatically.
- Browser print / PDF and downloadable JSON backup of the original stored service data.
- PWA standalone manifest, PNG home-screen icons and offline static app shell.

## Data boundaries

This is a **local browser storage app**, not a shared server database. Phone, desktop and iPad each have separate histories. A different origin, browser, browser profile or home-screen installation may have separate storage. No cross-device synchronization is provided. Export backups before a deployment or changing origin. Clearing browser/app data can erase local history.

Service history uses the original key `weide-brake-service-records`, so valid records from the September 27 build remain readable. The warranty key `weide-warranty-records-v2` is never read, migrated, modified or deleted. Warranty data is not shown as fluid service data. There are no delete-record or clear-all actions. Failed writes retain the form; corrupt history blocks writes instead of silently overwriting it. Backup exports preserve the raw original service value, even if corrupt. There is no automated import or migration.

Do not apply this patch to `BRAKE-FLUID-SERVICE-REMINDER` or the separate Warranty Card repository/service. Those applications, API endpoints and data stores are outside this change. No Railway deployment or production data access is part of the repair.

Local record numbering uses the maximum existing suffix and re-reads storage before save. It is not a globally unique server-issued number and does not provide transactional protection for simultaneous saves from two tabs.

## Run and test

Serve the root over HTTP (localhost) or HTTPS. PWA installation needs HTTPS outside localhost; opening the file directly is not the supported installation path.

```sh
python3 -m http.server 8080
npm ci
npm test
npx playwright install --with-deps chromium webkit
npm run test:browser
```

Browser tests start their own temporary localhost static server and use simulation-only records. They cover desktop (1440×900 Chromium), phone (360×800 Chromium), iPad size (820×1180 WebKit), save/reload, existing history, date/mileage, search, escaped card content, WhatsApp URL, warranty storage isolation, responsive width, print visibility, Chromium offline reload, manifest/icons and corrupt-data protection. Playwright service-worker automation is Chromium-only (https://playwright.dev/docs/service-workers); WebKit tests cover the core app flows, with physical iPad offline/installation checks still pending. The optional `CHROMIUM_EXECUTABLE` override runs all profiles in Chromium when WebKit is unavailable. These simulations do not replace physical-device home-screen installation and WhatsApp handoff tests. No tests connect to Railway or send messages.

## Deployment gate

1. Review the repair branch/PR and test evidence. Keep Railway production on its current revision.
2. Obtain the exact previously selected Performance Style artwork. The existing generic WEIDE SVG is retained; 192px/512px PNG copies improve installation compatibility. These are not the final selected icon design.
3. Verify the Railway project/service is exactly `Brake Service record` / `brake-service-record`, its source repository/branch and publish root. Do not use Warranty Card or `BRAKE-FLUID-SERVICE-REMINDER` settings.
4. Export service backups and warranty backups through their respective original apps on each relevant device/browser. Record current deployment revision for rollback.
5. Deploy only to an isolated test environment/domain first. Test actual Samsung/desktop/iPad installation, icon/name, offline reopening, print and WhatsApp handoff. No automatic copying of production customer data.
6. After explicit production approval, arrange the production rollout. A Railway service linked to `main` may deploy automatically on PR merge: do not merge before the gate is complete.
7. Existing PWA tabs must all be closed/reopened for the waiting new service worker to activate. The repaired worker preserves unrelated caches and all local storage, and does not force reload an unfinished form.
