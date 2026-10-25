# HVAC Fleet & Diagnostics Manager

A backend system for monitoring HVAC unit health, tracking sensor data, and running automated rule-based diagnostics.

## Features

- **Fleet overview:** Organize customers and their HVAC units, with fleet-level status summaries.
- **Unit dashboard:** Review the latest available sensor readings, health score, fault indicators, and diagnostic history.
- **Sensor-data API:** Accept timestamped numeric readings for a registered unit.
- **Rule-based diagnostics:** Calculate temperature differential and prototype scores for possible airflow restriction, short cycling, and low-charge-like patterns.
- **Persistent history:** Store readings, diagnostic outputs, and the latest unit status in PostgreSQL.
- **Authentication:** Protect application API routes using Replit OpenID Connect authentication and server-side sessions.
