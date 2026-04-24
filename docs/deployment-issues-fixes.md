# Fineract Deployment Issues and Fixes

This document summarizes the issues encountered during the Fineract wave-4 deployment and their resolutions.

## Issue 1: Helm Template Validation Error - "apiVersion not set"

**Symptom:**
```
Error: INSTALLATION FAILED: unable to build kubernetes objects from release manifest: [unable to recognize "": no version info, unable to recognize "": no version info]
```

**Root Cause:**
Typo in [`deployment-read.yaml`](../helm/charts/fineract-core/templates/fineract/deployment-read.yaml:1) line 1: `e{{/*` instead of `{{/*`

**Fix:**
Corrected the typo to `{{/*`

---

## Issue 2: Duplicate YAML Keys in Values File

**Symptom:**
- Fineract pods using wrong image (`apache/fineract:1.8.0` instead of `ghcr.io/adorsys-gis/fineract:586bd68f9`)
- `yq '.fineract.image'` returning `null`

**Root Cause:**
Duplicate `fineract:` keys in [`fineract-core-values.yaml`](../helm/values/dev/fineract-core-values.yaml):
- Line 22: `fineract:` with `image`, `read`, `write`, `batch` configurations
- Line 262: `fineract:` with only `api.username` and `api.password`

In YAML, duplicate keys cause the second one to overwrite the first, losing the image configuration.

**Fix:**
Merged the two `fineract:` sections into one, adding `api` section after `batch`:
```yaml
fineract:
  image:
    repository: ghcr.io/adorsys-gis/fineract
    tag: "586bd68f9"
    pullPolicy: IfNotPresent
  read: ...
  write: ...
  batch: ...
  api:
    username: mifos
    password: password
```

---

## Issue 3: Missing Databases

**Symptom:**
```
FATAL: database "fineract_tenants" does not exist
```

**Root Cause:**
PostgreSQL databases `fineract_tenants` and `fineract_default` were not created during cluster setup.

**Fix:**
Created databases manually on the primary PostgreSQL instance:
```bash
kubectl exec -n fineract data-store-postgres-2 -- psql -U postgres -c "CREATE DATABASE fineract_tenants OWNER appuser;"
kubectl exec -n fineract data-store-postgres-2 -- psql -U postgres -c "CREATE DATABASE fineract_default OWNER appuser;"
```

**Note:** For reproducible deployments, add an init script or ConfigMap to create these databases automatically.

---

## Issue 4: FINERACT_NODE_ID NumberFormatException

**Symptom:**
```
java.lang.NumberFormatException: For input string: "fineract-core-write-558bb9f4f8-95gvj"
```

**Root Cause:**
`FINERACT_NODE_ID` was set to the pod name via `metadata.name`, but Fineract expects a numeric value.

**Fix:**
Changed `FINERACT_NODE_ID` to static numeric values in deployment templates:
- Write: `value: "1"`
- Read: `value: "2"`
- Batch: `value: "3"`

Files modified:
- [`deployment-write.yaml`](../helm/charts/fineract-core/templates/fineract/deployment-write.yaml)
- [`deployment-read.yaml`](../helm/charts/fineract-core/templates/fineract/deployment-read.yaml)
- [`deployment-batch.yaml`](../helm/charts/fineract-core/templates/fineract/deployment-batch.yaml)

---

## Issue 5: Health Probes Failing with HTTP 400

**Symptom:**
```
Startup probe failed: HTTP probe failed with statuscode: 400
```
Pods stuck in `0/1 Running` state.

**Root Cause:**
The management port 9090 runs HTTPS (`Tomcat initialized with port 9090 (https)`), but the health probes were using HTTP (default scheme).

**Fix:**
Added `scheme: HTTPS` to all health probes in deployment templates:

```yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: management
    scheme: HTTPS  # Added
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: management
    scheme: HTTPS  # Added
startupProbe:
  httpGet:
    path: /actuator/health
    port: management
    scheme: HTTPS  # Added
```

Files modified:
- [`deployment-write.yaml`](../helm/charts/fineract-core/templates/fineract/deployment-write.yaml)
- [`deployment-read.yaml`](../helm/charts/fineract-core/templates/fineract/deployment-read.yaml)
- [`deployment-batch.yaml`](../helm/charts/fineract-core/templates/fineract/deployment-batch.yaml)

---

## Issue 6: User-Sync Keycloak Authentication Failure

**Symptom:**
```
ERROR - Failed to connect to Keycloak: 401: {"error":"invalid_client","error_description":"Invalid client or Invalid client credentials"}
```

**Root Cause:**
The Keycloak client was configured with ID `user-sync-service`, but the deployment was using `user-sync` as the client ID.

**Fix:**
Updated [`fineract-core-values.yaml`](../helm/values/dev/fineract-core-values.yaml) to use the correct client ID:
```yaml
userSync:
  keycloak:
    clientId: user-sync-service  # Changed from "user-sync"
```

---

## Issue 7: Read and Batch Pods OutOfMemoryError

**Symptom:**
```
Caused by: java.lang.OutOfMemoryError: Java heap space
org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'externalEventConfigurationValidationService'
```

Pods stuck in `CrashLoopBackOff` with multiple restarts.

**Root Cause:**
Read and batch pods had insufficient memory (1Gi limit) compared to write pod (2Gi limit). The `ExternalEventConfigurationValidationService` performs classpath scanning using ClassGraph, which requires significant heap memory during startup.

**Fix:**
Increased memory limits for read and batch pods in [`fineract-core-values.yaml`](../helm/values/dev/fineract-core-values.yaml):

```yaml
fineract:
  read:
    resources:
      requests:
        cpu: 250m
        memory: 1Gi      # Increased from 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi      # Increased from 1Gi
  batch:
    resources:
      requests:
        cpu: 250m
        memory: 1Gi      # Increased from 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi      # Increased from 1Gi
```

**Note:** CPU requests were kept lower (250m) to avoid scheduling issues on resource-constrained clusters.

---

## Sealed Secrets Usage

This deployment uses **Sealed Secrets** for secure secret management. The following SealedSecrets are synchronized in the `fineract` namespace:

| SealedSecret | Status | Purpose |
|--------------|--------|---------|
| `fineract-config-credentials` | Synced | Fineract configuration credentials |
| `user-sync-credentials` | Synced | User-sync service credentials |
| `oauth2-proxy-secrets` | Synced | OAuth2 proxy configuration |
| `data-store-postgres` | Synced | PostgreSQL credentials |
| `keycloak-db-credentials` | Synced | Keycloak database credentials |
| `keycloak-keycloak` | Synced | Keycloak admin credentials |
| `keycloak-realm-credentials` | Synced | Keycloak realm configuration |

All secrets are managed via SealedSecrets, ensuring the deployment is fully automated and reproducible in any clean environment with the Sealed Secrets controller installed.

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `helm/values/dev/fineract-core-values.yaml` | Merged duplicate `fineract:` keys, fixed `userSync.keycloak.clientId`, increased memory for read/batch |
| `helm/charts/fineract-core/templates/fineract/deployment-write.yaml` | Fixed `FINERACT_NODE_ID`, added `scheme: HTTPS` to probes |
| `helm/charts/fineract-core/templates/fineract/deployment-read.yaml` | Fixed `FINERACT_NODE_ID`, added `scheme: HTTPS` to probes |
| `helm/charts/fineract-core/templates/fineract/deployment-batch.yaml` | Fixed `FINERACT_NODE_ID`, added `scheme: HTTPS` to probes |

---

## Automation with Helm Hooks

The deployment now includes automated initialization using Helm hooks:

### Hook Execution Order

```
┌─────────────────────────────────────────────────────────────┐
│                    Helm Install/Upgrade                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. database-init (weight: -10)                             │
│     - Waits for PostgreSQL                                   │
│     - Creates fineract_tenants database                      │
│     - Creates fineract_default database                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. keycloak-init (weight: -5)                               │
│     - Waits for Keycloak                                     │
│     - Creates 'fineract' realm                               │
│     - Creates 'user-sync-service' client                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Main Resources                                           │
│     - Deployments (write, read, batch)                       │
│     - Gateway, OAuth2 Proxy, User-Sync                       │
│     - Services, Ingress, ConfigMaps                          │
└─────────────────────────────────────────────────────────────┘
```

### Configuration

Enable/disable automation in values file:

```yaml
databaseInit:
  enabled: true  # Auto-create databases
  image:
    repository: postgres
    tag: "15-alpine"

keycloakInit:
  enabled: true  # Auto-create realm and client
  image:
    repository: curlimages/curl
    tag: "8.5.0"
  url: http://keycloak-service.fineract.svc.cluster.local:8080
  realm: fineract
```

### Prerequisites for Clean Environment

| Component | Requirement | Automated? |
|-----------|-------------|------------|
| Kubernetes cluster | With Sealed Secrets controller | Manual |
| PostgreSQL instance | Running and accessible | Manual |
| Keycloak instance | Running and accessible | Manual |
| Redis instance | Running and accessible | Manual |
| SealedSecrets | Applied to cluster | Manual |
| Databases | fineract_tenants, fineract_default | **Automated** |
| Keycloak realm | 'fineract' realm with client | **Automated** |

### Deployment Command

```bash
helm upgrade --install fineract-core ./helm/charts/fineract-core \
  -n fineract \
  -f helm/values/dev/fineract-core-values.yaml
```

---

## Lessons Learned

1. **YAML duplicate keys** are silently overwritten - use `yamllint` to catch these errors
2. **Helm template debugging** - use `helm template --debug` to verify rendered output
3. **Health probe schemes** must match the server protocol (HTTP vs HTTPS)
4. **Database initialization** should be automated for reproducible deployments - now implemented with Helm hooks
5. **Always reference working implementations** - the `~/Projects/fineract-gitops` folder was invaluable for comparison
6. **Memory requirements** - Fineract requires at least 2Gi memory for reliable startup; ClassGraph scanning is memory-intensive
7. **Sealed Secrets** - Using SealedSecrets ensures secure, automated secret management for reproducible deployments
8. **Helm hooks** - Use pre-install hooks for dependency initialization to ensure clean environment deployments work automatically
