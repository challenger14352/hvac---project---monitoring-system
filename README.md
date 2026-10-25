On The Spot — HVAC Diagnostics
On The Spot is a web application prototype for monitoring HVAC equipment and turning sensor readings into fleet health scores and diagnostic signals. The project includes a public interactive sample demo and a sign-in-protected application for managing customers, units, and readings.

Demo
Open the interactive sample demo

The demo uses fictional facilities and sensor data. Select a unit to view its sample temperature history, calculated fault scores, and health score. Its calculations use the same scoring functions as the server. It does not read from or write to the customer database.

The link above is the current Replit workspace preview. For a long-term GitHub link, replace it with the published application URL followed by /demo.

Features
Public product landing page and interactive demo at /demo
Replit OpenID Connect sign-in for the operational application
Customer and HVAC unit management
Fleet health overview and unit detail pages
Sensor reading ingestion through a JSON API
Diagnostic calculations for airflow restriction, short cycling, and low-charge suspicion
PostgreSQL storage using Drizzle ORM
Sample trends and calculations that can be explored without an account
How the diagnostics work
The ingestion endpoint stores sensor readings and runs the diagnostic worker for that unit. The worker calculates the temperature difference (return-air temperature minus supply-air temperature), fault signals, and a composite health score. Results are stored as diagnostics and current unit status.

The current scoring functions are in shared/scoring.ts and are shared by the server worker and public demo:

Airflow restriction: combines filter differential pressure, blower current, and a low temperature-difference penalty.
Short cycling: scores compressor starts observed in a 60-minute call-for-cooling series.
Low-charge suspicion: considers temperature difference and condenser current, with a temperature-based contribution when runtime exceeds 30 minutes.
Health score: 100 − (0.45 × restriction + 0.30 × short cycling + 0.25 × low-charge suspicion), clamped to the 0–100 range.
Fault scores represent the strength of a possible fault signal: higher is more suspicious. Health scores work in the opposite direction: higher is healthier. These are prototype diagnostic heuristics, not a substitute for a qualified HVAC technician’s inspection.

Technology
Frontend: React, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Recharts
Backend: Node.js, Express, TypeScript
Database: PostgreSQL with Drizzle ORM
Authentication: Replit OpenID Connect, Passport, and PostgreSQL-backed Express sessions
Project layout
client/src/
  pages/
    LandingPage.tsx       Public product website
    PublicDemo.tsx        Interactive demo with fictional sample data
    CompanyDashboard.tsx  Customer and fleet dashboard
    CustomerDetail.tsx    Customer equipment view
    UnitDashboard.tsx     Unit readings and diagnostic history
  hooks/                  Client-side authentication and UI hooks
  lib/                    API and query-client utilities
server/
  index.ts                Express startup and middleware
  routes.ts               Authenticated application API routes
  storage.ts              PostgreSQL data access
  worker.ts               Sensor-to-diagnostic processing
  scoring.ts              Compatibility re-export for shared scoring
  replit_integrations/auth/
                          Replit OIDC authentication and user storage
shared/
  schema.ts               Database tables, validation schemas, and types
  scoring.ts              Shared diagnostic scoring functions
  models/auth.ts          User and session database models
Getting started
This project is configured for Replit. A clone needs a PostgreSQL database and a correctly configured Replit OIDC application before authentication and database-backed pages will work.

Requirements
Node.js and npm
PostgreSQL
Replit authentication configuration for the application host
Environment configuration
Configure these values through the runtime’s secrets/environment settings. Do not commit credentials to GitHub.

Variable	Purpose
DATABASE_URL	PostgreSQL connection string
SESSION_SECRET	Secret used to sign Express sessions
REPL_ID	Replit OIDC client identifier
ISSUER_URL	Optional OIDC issuer; defaults to https://replit.com/oidc
The OIDC callback URL is built from the current host as /api/callback; configure the authentication provider for the host where the app runs.

Install, initialize, and run
npm install
npm run db:push
npm run dev
The development server serves the frontend and API on port 5000.

Useful commands
npm run dev       # Start the development server
npm run build     # Build the client and server for production
npm start         # Start the production build
npm run check     # Run the TypeScript compiler
npm run db:push   # Apply the Drizzle schema to PostgreSQL
API overview
Application API routes require an authenticated session. The public sample demo is a client-side route and does not use these endpoints.

Method	Endpoint	Purpose
GET	/api/auth/user	Get the signed-in user
GET	/api/customers	List customers and their fleet summaries
POST	/api/customers	Create a customer
GET	/api/customers/:id	Get a customer
DELETE	/api/customers/:id	Delete a customer and its related records
GET	/api/customers/:customerId/units	List a customer’s units
POST	/api/customers/:customerId/units	Create a unit
GET	/api/units/:id	Get unit details, latest readings, status, and diagnostics
POST	/api/ingest	Store sensor readings and run diagnostics
GET	/api/fleet/stats	Get fleet-level counts and average health
Sensor ingestion example
Send a JSON body to POST /api/ingest using an authenticated session and an existing unit ID:

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
ts is optional. The readings object accepts numeric sensor values. The diagnostic worker uses temp_return_f, temp_supply_f, amp_blower, amp_condenser, dp_filter_pa, and recent call_y readings when available. For short-cycle and runtime calculations, send call_y as a regular series of 0/1 readings (typically one per minute) over the previous hour. A single call_y value is not enough to calculate a meaningful runtime or number of starts.

Database model
The main operational tables are defined in shared/schema.ts:

customers — customer or facility records
units — HVAC equipment associated with a customer
readings — timestamped, keyed numeric sensor readings
diagnostics — timestamped calculated metrics and supporting metadata
unit_status — latest health score and fault summary for each unit
users and sessions — authentication users and server sessions
Notes
/demo is public and read-only. Its data is fictional, in-memory sample data; it does not populate the PostgreSQL database.
The main customer, fleet, and unit APIs require sign-in.
The project does not currently define an automated test script in package.json.
