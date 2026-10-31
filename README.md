# On The Spot

## HVAC fleet monitoring and diagnostics

On The Spot is a web application for organizing HVAC customers and equipment, reviewing fleet health, and turning sensor readings into diagnostic signals.

## Live demo

[Open the interactive sample demo](https://drive.google.com/file/d/1ap8JPwjyAaUxmSzGAD_wf_O5X43TwB4B/view?usp=sharing)

The public demo uses fictional facilities and sample HVAC sensor data. Browse the fleet, search customers, open customer details, and explore each unit's **MVP Core**, **Ultimate Mode**, **Unit Health**, and **Live hardware** views. You can add a sample customer to preview the workflow; demo changes are stored only in the current browser session and are never written to the customer database.

- [Explore a sample unit](https://app.otspotair.com/demo/unit/RTU-001)  
- [Open the sample unit's Live hardware view](https://app.otspotair.com/demo/unit/RTU-001?view=hardware)

The Live hardware view connects a real ESP32 on the visitor's own computer. It is not a broadcast of the project's physical device. Visitors without hardware can still explore the fictional HVAC views without signing in.

## Features

- Public, no-login product demo with direct fleet, customer, and unit views  
- Integrated sample-unit hardware view with Start/Stop USB capture, temperature/current readouts, charts, and CSV export  
- App-branded Clerk sign-in and sign-up for the operational application  
- Customer and HVAC unit management  
- Account-scoped customer, equipment, reading, diagnostic, and fleet-stat queries  
- JSON sensor-reading ingestion and server-side diagnostic processing  
- Fleet health scores and signals for airflow restriction, short cycling, and possible low charge  
- PostgreSQL persistence using Drizzle ORM  
- Automated browser tests for the public demo and account isolation  
- Staff-only review and explicit account assignment for unassigned legacy records

## Real hardware inside a sample unit

Choose **Live hardware** on a sample unit to connect an ESP32 running the `ots-bench-v1` JSON sketch. **Start USB capture** opens the browser's device chooser; **Stop USB capture** ends acquisition. Switching between the sample unit's views keeps that local session running.

This view provides:

- Real DS18B20 temperature readings in Celsius and derived Fahrenheit  
- Nominal SCT013 current estimates when the firmware reports a valid current channel  
- A rolling history of up to 300 validated frames, with separate temperature and current charts  
- CSV download of retained readings, including browser-observed USB data-loss markers  
- Receive-error recovery, stale-reading labels, and explicit warnings rather than invented values

Real hardware readings do **not** replace the fictional unit data or recalculate the sample HVAC health score. The public sample-unit view never uploads measurements or requests private account data. Export before leaving or refreshing: its in-memory history is not durable storage.

Use desktop Chrome or Edge over HTTPS and open the page in its own browser tab. Close Arduino Serial Monitor before connecting the browser. Mobile browsers and embedded previews may not support Web Serial.

## USB fan bench test

Open `/bench` in a top-level Windows Chrome/Edge tab to receive real USB serial frames from the ESP32. No login is needed for local display; optional saving requires your normal authenticated session and an account-owned unit of type `bench_test`. The bench page can explicitly create that unit under a selected customer. It does not use fictional demo data or run HVAC diagnostics.

The bench readouts, saved snapshots, and chart tooltips show both °F and °C; Fahrenheit is derived from the original Celsius sensor value, not independently measured. CSV exports include both `temperature_c` and `temperature_f`, leaving both blank when a temperature is unavailable. Stored readings and firmware stay in their original units. HVAC return/supply values and temperature differences also display both units; differences use scaling only, without a 32-degree offset.

The live history plots actual received temperatures with °C/°F scales and valid nominal current estimates separately in A, using browser arrival times. It displays the latest 300 frames and up to five most recently seen probe addresses. Missing readings remain gaps, disabled current is not treated as zero, and stopped or stale history is explicitly labeled. This rolling chart buffer is not durable storage: export CSV or opt into account saving for retention.

- Firmware: [ESP32 bench sketch](https://github.com/challenger14352/hvac---project---monitoring-system/tree/firmware)
- Hardware/library sources: [Sources and disclosure](https://github.com/challenger14352/hvac---project---monitoring-system/tree/hardware))

The sketch starts with current sampling disabled pending circuit checks. DS18B20 temperatures work independently; current is a nominal RMS estimate for the photographed SCT013 100 A / 1 V and must not be treated as calibrated. Do not open/cut a fan cord or expose mains: use only an appropriately rated commercial enclosed clamp-meter line splitter per its instructions. A box fan and filter do not establish HVAC fault detection, airflow, or pressure drop.

`POST /api/bench/ingest` validates the USB frame, stores only `bench_` keys, and confirms an account-visible save without running the diagnostic worker. `GET /api/bench/units/:id` returns stored bench readings, not live status. Both data endpoints require authentication and ownership; firmware and guide downloads under `/api/bench/files/` are public. These software paths do not prove that hardware was connected, calibrated, or tested.

## How diagnostics work

The ingestion API accepts numeric sensor readings for a unit. The server worker uses recent readings to calculate the return-to-supply temperature difference and possible fault scores. Overall health requires complete, recent sensor evidence and sufficient cooling-call history; missing or stale measurements must not imply healthy equipment. Status and diagnostic results are stored with the unit's history.

The shared scoring implementation is in `shared/scoring.ts`:

- **Temperature difference:** return-air temperature minus supply-air temperature.  
- **Airflow-restriction score:** considers filter differential pressure, blower current, and temperature difference.  
- **Short-cycling score:** counts starts in a 60-minute call-for-cooling series.  
- **Low-charge suspicion score:** considers temperature difference and condenser current, with an additional temperature-based contribution when runtime exceeds 30 minutes.  
- **Health score:** `100 − (0.45 × restriction + 0.30 × short cycling + 0.25 × low-charge suspicion)`, bounded from 0 to 100\.

Fault scores indicate how strongly the readings match a possible issue; higher scores mean a stronger signal. A higher health score means better estimated health. These prototype heuristics are not a substitute for inspection by a qualified HVAC technician.

## Account privacy

Operational API routes require a signed-in session and scope customer and unit access to the authenticated account. Sensor ingestion also verifies that the submitted unit belongs to that account before saving readings or running diagnostics.

Older database records without a verified owner are intentionally not exposed through account-scoped APIs. They remain unassigned until a trustworthy owner mapping is available; the application does not guess which account should receive them.

The public demo is separate from operational data. Its sample data is fictional, and adding a demo customer does not make a database request.

## Technology

- **Frontend:** React, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Recharts  
- **Backend:** Node.js, Express, TypeScript  
- **Database:** PostgreSQL with Drizzle ORM  
- **Authentication:** Clerk with same-origin session cookies and an application authorization bridge  
- **Firmware:** Arduino C++ for ESP32, with ADS1115 and DS18B20 libraries  
- **Optional desktop logging:** Python USB logging utility  
- **Tests:** Node.js test runner and headless Chromium

## Project structure

```
client/src/
  pages/
    LandingPage.tsx          Public product page
    PublicDemo.tsx           Interactive sample workspace
    CompanyDashboard.tsx     Customer and fleet dashboard
    CustomerDetail.tsx       Customer equipment view
    UnitDashboard.tsx        Readings and diagnostic views
  lib/                       Demo data and client utilities

attached_assets/
  AOF_eagle_1771799559884.png
                             Frontend logo required by the Vite build

server/
  index.ts                   Express startup and middleware
  routes.ts                  Authenticated API routes
  storage.ts                 PostgreSQL data access
  worker.ts                  Sensor-to-diagnostic processing
  auth/                      Clerk account bridge and removed-account protection
  middlewares/               Production authentication proxy

shared/
  schema.ts                  Drizzle tables, validation, and shared types
  scoring.ts                 Shared diagnostic scoring functions
  models/auth.ts             User and session models

tests/
  account-isolation.test.mjs API account-isolation tests
  public-demo.e2e.test.mjs   Public demo browser tests
```

## Getting started

Use Node.js 20.19+ or a compatible newer release and npm. Running the operational app requires PostgreSQL and configured authentication. The public sample demo does not require visitor sign-in, but the full server still requires its environment configuration.

App-branded authentication is provided by Clerk through the application's own sign-in and sign-up pages.

### 1\. Install dependencies

```sh
npm ci
```

### 2\. Configure the environment

Set these values in your deployment's secure environment-variable manager. Do not commit credentials or local environment files to GitHub.

| Variable | Purpose |
| :---- | :---- |
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Server-side authentication key |
| `CLERK_PUBLISHABLE_KEY` | Publishable key used by the server authentication setup |
| `VITE_CLERK_PUBLISHABLE_KEY` | Publishable key used by the frontend build |
| `PORT` | Optional server port; defaults to `5000` |

The in-app authentication routes are `/sign-in` and `/sign-up`, including their callback subpaths. Authentication depends on deployment-specific keys, domains, and the production same-origin `/api/__clerk` proxy. A GitHub clone alone does not recreate the hosted identity configuration. Review that integration before running on a different host; do not assume replacing keys alone is sufficient. Frontend publishable-key changes require a new build. Development tests do not verify production sign-in.

### 3\. Prepare the database and start the app

```sh
npm run db:push
npm run dev
```

The development server serves the web app and API on port `5000` by default. These commands use the configured process environment; do not assume a local `.env` file is loaded automatically.

For a production build:

```sh
npm run build
npm start
```

Serve the application over HTTPS for authentication and browser USB access. Review and apply database changes separately; starting the server is not permission to mutate a production database.

`npm run db:push` synchronizes the configured PostgreSQL database with the Drizzle schema. For existing customer tables it first adds the nullable ownership column and customer uniqueness constraint in a transaction, so the unit ownership foreign key can be applied in dependency order. This preparation never assigns owners or removes rows. Review schema changes before applying them to a database with existing records. Do not use a force option to skip Drizzle's data-safety prompts. Records with no verified account owner are deliberately left inaccessible until they can be safely assigned.

For an inspected **development** database that still has the pre-ownership tables, `scripts/repair-development-ownership.sql` provides a targeted alternative to a full schema synchronization. It adds only nullable ownership columns, their constraints and indexes, and the archive-event table. The transaction verifies that historical values and existing ownership remain unchanged before committing; it never backfills account IDs. This is an explicit development repair, not a startup or production migration hook. Verify the target environment before executing it. Test it with `node --import tsx --test tests/development-ownership-repair.test.mjs` (requires `initdb` and `pg_ctl`).

## Unassigned record review

Staff access is disabled unless the server's `STAFF_USER_IDS` environment variable contains one or more exact local application account IDs, separated by commas. Migrated accounts retain their original IDs through Clerk's `sessionClaims.userId`. Configure this allowlist through your deployment's secure environment settings; do not add it to source control. Authorized staff can use:

- `GET /api/staff/unassigned` to review unassigned customers and their units, plus account choices for explicit mapping.  
- `PUT /api/staff/unassigned/:customerId/assignment` with `{"accountId":"..."}` to assign an unowned customer and its unowned units to the selected account.

Assignments reject already-owned customers, invalid account IDs, and units with conflicting existing owners. Customer and unit owner changes are transactional. Staff API response bodies are not written to request logs. Unassigned records remain excluded from customer-scoped APIs until an assignment succeeds.

### Useful commands

```sh
npm run dev                    # Start the development server
npm run build                  # Build the client and server
npm start                      # Start the production build
npm run check                  # Run the TypeScript compiler
npm run test:demo              # Test public demo routes and interactions
npm run test:database-outage   # Verify real dev startup and public USB tools without PostgreSQL
npm run test:bench             # Test bench protocol/API and synthetic USB browser flow
npm run test:account-isolation # Test account-scoped API behavior
npm run test:ownership-upgrade # Verify legacy history survives the ownership schema upgrade
npm run test:device-ingestion  # Exercise device access using disposable PostgreSQL fixtures
npm run test:device-firmware   # Check uploader retry/TLS configuration logic with host doubles
npm run db:push                # Synchronize the database schema
```

In development, startup performs a read-only ownership-column check. If `customers.owner_id` or `units.owner_id` is missing, the server logs an actionable setup warning and authenticated customer, unit, and fleet APIs return HTTP 503 with `DEVELOPMENT_DATABASE_SETUP_REQUIRED` before querying those columns. Run `npm run check:database` to inspect all missing application columns. Confirm the development database target, then review `scripts/repair-development-ownership.sql` for a targeted ownership repair, or `npm run db:push` for a full reviewed schema update. Neither repair runs automatically; never force or truncate existing data or infer legacy owners. Requests recheck readiness, so an explicit repair can be followed by a retry. The public `/connect` USB tool does not depend on this check. Production startup and its existing health endpoint are unchanged.

The demo browser tests require Chromium. If it is not on your `PATH`, set `CHROMIUM_PATH` to the Chromium executable before running `npm run test:demo`. The account-isolation tests use an isolated in-memory test store and do not need production data.

`npm run test:database-outage` also requires Chromium (or `CHROMIUM_PATH`) and the normal development Clerk configuration. It starts the real Express/Vite application on temporary ports against loopback-only hanging and refused database endpoints. It checks bounded startup, `/connect`, actual firmware downloads, no account API requests from the public page, and continued authentication enforcement. No PostgreSQL installation or schema changes are needed, and the configured application database is never used. Development account access remains blocked until account-removal protection initializes; after an initialization failure, fix the database connection and restart the development server. Production still waits for that protection before serving requests.

The ownership-upgrade tests require PostgreSQL tools (`initdb` and `pg_ctl`) on `PATH` and must run as a non-root user. Each case starts a disposable PostgreSQL instance on a private Unix socket and seeds the pre-ownership schema and history. Cases cover the original legacy schema and interrupted upgrades with owner columns already present, both with and without the prerequisite customer unique constraint. Each runs the real `npm run db:push` workflow twice, checks complete ownership constraints and indexes, verifies that every historical row and value survives with null owners, and confirms that the second push reports no changes and leaves schema object identities unchanged. Tests never connect to the configured application database or use `--force`, and remove their temporary databases afterward.

## API overview

All operational endpoints below require an authenticated session. Customer and unit operations are scoped to the signed-in account; requests for records owned by another account or records with no verified owner return not found. Staff review and assignment endpoints additionally require the caller's account ID to appear in `STAFF_USER_IDS`.

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
| `GET` | `/api/account` | Resolve the signed-in local application account |
| `GET` | `/api/customers` | List the account's customers and fleet summaries |
| `POST` | `/api/customers` | Create a customer owned by the signed-in account |
| `GET` | `/api/customers/:id` | Get one account-owned customer |
| `DELETE` | `/api/customers/:id` | Delete an account-owned customer and its related records |
| `GET` | `/api/customers/:customerId/units` | List units for an account-owned customer |
| `POST` | `/api/customers/:customerId/units` | Create a unit for an account-owned customer |
| `GET` | `/api/units/:id` | Get unit details, latest readings, status, and diagnostics |
| `POST` | `/api/ingest` | Store readings and run diagnostics for an owned unit |
| `GET` | `/api/fleet/stats` | Get account-level fleet totals and health |
| `GET` | `/api/staff/unassigned` | Staff-only review of unassigned customers, units, and account choices |
| `PUT` | `/api/staff/unassigned/:customerId/assignment` | Staff-only explicit assignment of an unowned customer and its unowned units |

### Sensor ingestion example

Send a JSON body to `POST /api/ingest` using an authenticated session and a unit ID owned by that account:

```json
{
  "unitId": "your-existing-unit-id",
  "ts": "2026-10-25T14:30:00.000Z",
  "readings": {
    "temp_return_f": 75,
    "temp_supply_f": 62.7,
    "amp_blower": 4,
    "amp_condenser": 3,
    "dp_filter_pa": 80,
    "call_y": 1
  }
}
```

`ts` is optional; when omitted, the server uses the current time. `readings` is a map of numeric values. The diagnostic worker recognizes `temp_return_f`, `temp_supply_f`, `amp_blower`, `amp_condenser`, `dp_filter_pa`, and recent `call_y` readings. For short-cycling and runtime calculations, send `call_y` regularly (typically once per minute) over the previous hour. A single reading cannot establish a meaningful runtime or number of starts.

## Database tables

The schema is defined in `shared/schema.ts`:

- `customers` and `units` — facilities and equipment, with account ownership  
- `readings` — timestamped numeric sensor values  
- `diagnostics` — calculated signals and supporting metadata  
- `unit_status` — the latest health score and fault summary for each unit  
- `users` — local application accounts, keyed by the original ID for migrated users  
- `sessions` — retained legacy session data (not used for new authentication)  
- `removed_accounts` — permanent denial markers, independent of deleted account rows

## Physical current-sensor bench test

Open **`/connect`** on the app for the ESP32 connection page. It includes downloadable Arduino firmware, wiring instructions, and a local USB serial reader for desktop Chrome or Edge. Close Arduino Serial Monitor before connecting the browser to the same port. USB measurements are uncalibrated, local by default. Start and stop a recording to export CSV, or explicitly save the stopped session to a selected unit in your signed-in account. Bench logs remain separate from the live ingestion API and do not establish HVAC health.

The [USB firmware and wiring guide](https://github.com/challenger14352/hvac---project---monitoring-system/tree/README.md) covers the SCT013 **100 A / 1 V** voltage-output CT, ADS1115, and ESP32. The sketch reports DC-offset-corrected RMS current through Serial Monitor using a documented bias and input-divider circuit. Uploads are disabled by default. After reference-meter validation, the guide explains how to enable certificate-verified HTTPS uploads using a revocable token for one real account unit, without a browser login. The device path accepts only the current channel actually measured; it never creates missing sensor values or an overall health score.

The unit page provides one-time token creation/replacement and revocation. Only token hashes are stored on the server; keep the filled-in `DeviceConfig.h` private and out of Git. Archival, ownership changes, or account removal invalidate device access without deleting measurement history. On a database missing the existing ownership schema, device endpoints explicitly return setup-required errors until the supported schema upgrade has been applied and the app restarted.

The RMS arithmetic has automated host-side tests using synthetic samples. ESP32 compilation, physical wiring, measurement accuracy, and safe equipment installation still require verification on the actual hardware. No physical sensor results are claimed by the sample demo.

## Workspace administration and release checks

Signed-in accounts can use `/settings` to save their organization name, default equipment timezone, and dashboard refresh interval. `/technicians` is an account-private contact roster with add/edit/archive/restore controls; it does not create technician login accounts or grant access.

The customer screen supports equipment creation and archiving a customer without deleting equipment or measurement history.

Run `npm run check:database` for a read-only schema preflight and `npm run test:database-readiness` for an offline, non-mutating regression check against the Drizzle schema, auth, and workspace models. When changing models, update `server/database-readiness-contract.ts`; any deliberately optional column must have an explicit reason there. Nullable/defaulted fields are not automatically optional because ORM queries still select them. The regression suite also checks the ownership-only development guard and the public health endpoint's limited output. Run `npm run test:workspace` for workspace API, persistence, USB protocol, and telemetry-quality checks. 

## Development and validation

The software was developed with AI-assisted programming support. Third-party libraries retain their authorship and license terms; see [hardware](https://drive.google.com/file/d/1UGRqzcJgutoGCYRIldSXtIfuLt0i03fa/view?usp=sharing) sources and disclosure for the acquisition libraries and references.

Automated browser and firmware-host tests use synthetic fixtures. They verify software behavior, not physical sensor accuracy, calibration, electrical safety, or successful operation on every USB driver. The sample demo is not evidence of a calibrated HVAC instrument. Verify real wiring, device firmware, and measured results separately.

The package metadata declares the MIT license. Review third-party license requirements when redistributing the project.
