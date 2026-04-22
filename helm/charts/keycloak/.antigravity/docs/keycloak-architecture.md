# Keycloak & Keybound Architecture Deep-Dive

This document explains why the Keycloak standalone chart is structured this way, how it interacts with the database, and how the Keybound integration functions.

---

## 1. Why not just a `values.yaml`?

If you were using an **official chart** (like from Bitnami or Codecentric) as a "dependency," you would only need a `values.yaml` to override their defaults.

However, we are building a **Standalone Custom Chart**.
- **The Blueprint**: Kubernetes knows nothing about how to run Keycloak until we give it the files in `/templates/` (`deployment.yaml`, `service.yaml`, etc.). Think of these as the **CAD drawings** for a building.
- **The Configuration**: `values.yaml` is like the **spec sheet** (what color are the walls, what's the address).
- **The Extraction**: Because we pulled these files out of the large `fineract-infra` umbrella, we had to "give them a new home." Without the template files, there is no "Keycloak" for the values to apply to.

---

## 2. How Keycloak Works (The DB Connection)

Keycloak is an "App Server." It stores all its data (users, roles, settings) in a relational database.
- **It doesn't have its own DB**: It uses the PostgreSQL instance you already have running.
- **Table Creation**: On its very first startup, Keycloak connects to the `keycloak` database and creates over 100 tables automatically.
- **Idempotency**: Every time the pod restarts, it checks if the tables are there. If they are, it just starts up normally.
- **Connectivity**: We use `KC_DB_URL_HOST` and the secrets to point Keycloak to the right place.

---

## 3. Keybound: Plugin vs. Service

This is a common point of confusion. Here is the split:

### Is it a Service?
**No.** Keybound is **not** a separate container or pod. It is a **Plugin (SPI)**.
- It is a set of `.jar` files (Java code) that runs **inside** the Keycloak process.
- The `download-keybound` initContainer in our `deployment.yaml` literally "injects" these files into Keycloak before it starts.

### How does it communicate?
Although Keybound runs inside Keycloak, it needs to talk to your **User Storage Backend** (the service that actually holds your custom user data).

1.  **Request**: A user tries to log in.
2.  **Plugin Triggers**: Keycloak sees the user isn't in its own DB, so it asks the **Keybound Plugin**.
3.  **External Call**: Keybound makes an HTTP call to the URL defined in your `values.yaml` (`keycloak.keybound.userStorageUrl`).
4.  **Verification**: The Backend responds (e.g., "Yes, this user exists and the password is correct").
5.  **Success**: Keycloak issues a token.

---

## 4. Why 2 Secrets?

- **`secret.yaml` (Bootstrap Secret)**: This defines the **Ultimate Admin** of the Keycloak system (the one that can create realms, delete clients, etc.).
- **`secret-postgres.yaml` (Database Secret)**: This is the **Network Key**. It allows Keycloak to talk to PostgreSQL as a "regular user."

Even if they use the same username/password in dev, Kubernetes treats them as different "identity cards" for different security boundaries.

---

## Summary Flow
1. **Infrastructure**: PostgreSQL starts.
2. **Keycloak Chart**:
   - `Deployment` creates the Pod.
   - `InitContainer` waits for DB and downloads Keybound.
   - `Keycloak Container` starts, creates its tables, and loads the Plugin.
3. **Config-CLI**:
   - Once Keycloak is healthy, this Job runs once.
   - It reads `realm-fineract.yaml` and sets up your Clients (BFF, Mobile, etc.) and Roles.

---

## 5. User Authentication Flow (The "John" Example)

This explains how a user in your banking database gets authenticated by Keycloak without them being "copied" over manually.

1.  **Frontend**: User enters credentials (e.g., in the Azamra Mobile App).
2.  **Keycloak**: Receives the request, fails to find the user in `KC_DB`, and hands the request to the **Keybound Plugin**.
3.  **Keybound Plugin**: Makes an HTTP call to the **User-Storage Backend**.
4.  **User-Storage Backend**: Queries the **Fineract/Azamra PostgreSQL** database.
5.  **Database**: Confirms credentials and returns user attributes (email, roles, office_id).
6.  **Keybound**: Passes these attributes back to Keycloak.
7.  **Keycloak**: Dynamically creates a "Federated User" and issues a **JWT Token**.

**Key Takeaway**: Keycloak acts as the **Security Gate**, but your Fineract/Azamra DB remains the **Source of Truth** for user data. Keybound is the bridge that makes this "Zero-Latency Sync" possible.
