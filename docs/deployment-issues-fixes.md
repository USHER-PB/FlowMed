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

## Issue 8: Keycloak-Init Job - Wrong Service URL

**Symptom:**
```
Keycloak is unavailable - sleeping
<previous line repeated many times>
```

**Root Cause:**
The keycloak-init job was configured to connect to `keycloak-service.fineract.svc.cluster.local` but the actual Keycloak service is named `keycloak`.

**Fix:**
Updated the URL in [`fineract-core-values.yaml`](../helm/values/dev/fineract-core-values.yaml):
```yaml
keycloakInit:
  url: http://keycloak.fineract.svc.cluster.local:8080  # Changed from keycloak-service
```

---

## Issue 9: Keycloak-Init Job - Wrong Health Check Endpoint

**Symptom:**
```
HTTP_CODE: 404
{"error":"Unable to find matching target resource method"}
```

**Root Cause:**
The job was checking `/health` endpoint which doesn't exist in Keycloak. Keycloak exposes health status via `/realms/master` endpoint.

**Fix:**
Updated the health check in [`keycloak-init/job.yaml`](../helm/charts/fineract-core/templates/keycloak-init/job.yaml):
```bash
# Changed from:
until curl -s -o /dev/null -w "%{http_code}" ${KEYCLOAK_URL}/health | grep -q "200"; do
# To:
until curl -s -o /dev/null -w "%{http_code}" ${KEYCLOAK_URL}/realms/master | grep -q "200"; do
```

---

## Issue 10: Keycloak-Init Job - Missing jq Binary

**Symptom:**
```
/bin/sh: jq: not found
```

**Root Cause:**
The `curlimages/curl` image doesn't include `jq` which is required for parsing JSON responses from Keycloak API.

**Fix:**
Changed the image in [`keycloak-init/job.yaml`](../helm/charts/fineract-core/templates/keycloak-init/job.yaml) to `nicolaka/netshoot:latest` which includes both `curl` and `jq`:
```yaml
image: "nicolaka/netshoot:latest"
imagePullPolicy: IfNotPresent
```

---

## Issue 11: User-Sync Deployment - Wrong Secret Reference

**Symptom:**
```
Error: couldn't find key keycloak-client-secret in Secret fineract/keycloak-keycloak
```

**Root Cause:**
The user-sync deployment was referencing `secrets.keycloak.secretName` (which is `keycloak-keycloak`) instead of `secrets.userSync.secretName` (which is `user-sync-credentials`). The client secret for user-sync is stored in `user-sync-credentials` secret, not in the Keycloak admin secret.

**Fix:**
Updated the secret reference in [`user-sync/deployment.yaml`](../helm/charts/fineract-core/templates/user-sync/deployment.yaml):
```yaml
# Changed from:
secretKeyRef:
  name: {{ .Values.secrets.keycloak.secretName }}
  key: {{ .Values.secrets.keycloak.clientSecretKey | default "keycloak-client-secret" }}
# To:
secretKeyRef:
  name: {{ .Values.secrets.userSync.secretName }}
  key: {{ .Values.secrets.userSync.clientSecretKey | default "keycloak-client-secret" }}
```

---

## Issue 12: User-Sync Pod - Insufficient CPU Resources

**Symptom:**
```
0/3 nodes are available: 2 Insufficient cpu
```

**Root Cause:**
The cluster had limited CPU resources available. The user-sync pod was requesting 50m CPU which couldn't be scheduled.

**Fix:**
Reduced CPU requests in [`fineract-core-values.yaml`](../helm/values/dev/fineract-core-values.yaml):
```yaml
userSync:
  resources:
    requests:
      cpu: 10m      # Changed from 50m
      memory: 64Mi  # Changed from 128Mi
    limits:
      cpu: 100m     # Changed from 250m
      memory: 128Mi # Changed from 256Mi
```

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `helm/values/dev/fineract-core-values.yaml` | Merged duplicate `fineract:` keys, fixed `userSync.keycloak.clientId`, increased memory for read/batch, fixed keycloak-init URL, reduced user-sync resources |
| `helm/charts/fineract-core/templates/fineract/deployment-write.yaml` | Fixed `FINERACT_NODE_ID`, added `scheme: HTTPS` to probes |
| `helm/charts/fineract-core/templates/fineract/deployment-read.yaml` | Fixed `FINERACT_NODE_ID`, added `scheme: HTTPS` to probes |
| `helm/charts/fineract-core/templates/fineract/deployment-batch.yaml` | Fixed `FINERACT_NODE_ID`, added `scheme: HTTPS` to probes |
| `helm/charts/fineract-core/templates/keycloak-init/job.yaml` | Fixed health check endpoint, changed image to nicolaka/netshoot |
| `helm/charts/fineract-core/templates/user-sync/deployment.yaml` | Fixed secret reference for KEYCLOAK_CLIENT_SECRET |

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
  image: nicolaka/netshoot:latest  # Includes curl and jq
  url: http://keycloak.fineract.svc.cluster.local:8080  # Use actual service name
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
9. **Service names must match exactly** - Verify actual service names in the cluster before configuring init jobs (e.g., `keycloak` vs `keycloak-service`)
10. **Health check endpoints vary by application** - Keycloak uses `/realms/master` not `/health`; always verify the correct endpoint for each application
11. **Init container images need required tools** - Ensure the image has all necessary binaries (curl, jq, etc.); `nicolaka/netshoot` is a good debugging image
12. **Secret references must match actual storage** - Different components may store credentials in different secrets; verify which secret contains which key
13. **Resource constraints in dev clusters** - Reduce CPU/memory requests for non-critical workloads to allow scheduling on resource-constrained clusters

---

# Wave 7: Fineract UI Stack Deployment Issues

## Issue 14: ConfigMap redirectUri Hardcoded HTTPS

### Problem
All 8 UI application ConfigMaps had hardcoded HTTPS in the `redirectUri` field:
```json
"redirectUri": "https://{{ .Values.admin.hostname }}"
```

This caused authentication failures in local development environments that use HTTP.

### Solution
Modified all ConfigMap templates to conditionally use HTTP/HTTPS based on `tls.enabled`:

**Files Modified:**
- `helm/charts/fineract-ui-stack/templates/admin/configmap.yaml`
- `helm/charts/fineract-ui-stack/templates/portal/configmap.yaml`
- `helm/charts/fineract-ui-stack/templates/accounting/configmap.yaml`
- `helm/charts/fineract-ui-stack/templates/account-management/configmap.yaml`
- `helm/charts/fineract-ui-stack/templates/reporting/configmap.yaml`
- `helm/charts/fineract-ui-stack/templates/branch/configmap.yaml`
- `helm/charts/fineract-ui-stack/templates/cashier/configmap.yaml`
- `helm/charts/fineract-ui-stack/templates/asset/configmap.yaml`

**Fix Applied:**
```yaml
"redirectUri": "{{ if .Values.admin.tls.enabled }}https://{{ else }}http://{{ end }}{{ .Values.admin.hostname }}"
```

---

## Issue 15: Ingress TLS Hardcoded

### Problem
All 8 Ingress templates had hardcoded TLS sections and cert-manager annotations, causing issues in local development without cert-manager or TLS certificates.

### Solution
Modified all Ingress templates to conditionally include TLS and cert-manager annotations based on `tls.enabled`.

**Files Modified:**
- `helm/charts/fineract-ui-stack/templates/admin/ingress.yaml`
- `helm/charts/fineract-ui-stack/templates/portal/ingress.yaml`
- `helm/charts/fineract-ui-stack/templates/accounting/ingress.yaml`
- `helm/charts/fineract-ui-stack/templates/account-management/ingress.yaml`
- `helm/charts/fineract-ui-stack/templates/reporting/ingress.yaml`
- `helm/charts/fineract-ui-stack/templates/branch/ingress.yaml`
- `helm/charts/fineract-ui-stack/templates/cashier/ingress.yaml`
- `helm/charts/fineract-ui-stack/templates/asset/ingress.yaml`

**Fix Applied:**
```yaml
metadata:
  annotations:
    {{- if and .Values.admin.tls.enabled .Values.admin.ingress.clusterIssuer }}
    cert-manager.io/cluster-issuer: {{ .Values.admin.ingress.clusterIssuer }}
    {{- end }}
    {{- if .Values.admin.ingress.annotations }}
    {{- toYaml .Values.admin.ingress.annotations | nindent 4 }}
    {{- end }}
spec:
  ingressClassName: nginx
  {{- if .Values.admin.tls.enabled }}
  tls:
    - hosts:
        - {{ .Values.admin.hostname }}
      secretName: {{ .Values.admin.tls.secretName }}
  {{- end }}
```

---

## Issue 16: Missing imagePullSecrets for Private Registry

### Problem
UI application images are hosted on `ghcr.io` (GitHub Container Registry) which requires authentication. The deployment templates didn't include `imagePullSecrets`, causing `ImagePullBackOff` errors with `403 Forbidden`.

### Solution
1. Created a docker-registry secret with the registry credentials:
```bash
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=adorsys-gis \
  --docker-password=<token> \
  -n fineract
```

2. Added `imagePullSecrets` support to all deployment templates:

**Files Modified:**
- `helm/charts/fineract-ui-stack/templates/admin/deployment.yaml`
- `helm/charts/fineract-ui-stack/templates/portal/deployment.yaml`
- `helm/charts/fineract-ui-stack/templates/accounting/deployment.yaml`
- `helm/charts/fineract-ui-stack/templates/account-management/deployment.yaml`
- `helm/charts/fineract-ui-stack/templates/reporting/deployment.yaml`
- `helm/charts/fineract-ui-stack/templates/branch/deployment.yaml`
- `helm/charts/fineract-ui-stack/templates/cashier/deployment.yaml`
- `helm/charts/fineract-ui-stack/templates/asset/deployment.yaml`

**Fix Applied:**
```yaml
spec:
  {{- if .Values.global.imagePullSecrets }}
  imagePullSecrets:
    {{- toYaml .Values.global.imagePullSecrets | nindent 8 }}
  {{- end }}
  containers:
```

3. Added `global.imagePullSecrets` to values file:
```yaml
global:
  imagePullSecrets:
    - name: ghcr-credentials
```

---

## Issue 17: Incorrect Image Names and Tags

### Problem
The values file referenced images that didn't exist in the registry:
- `ghcr.io/adorsys-gis/fineract-accounting-app:fix-api-v1` - not found
- `ghcr.io/adorsys-gis/fineract-reporting-app:fix-api-v1` - not found
- Various apps using `:latest` tag which didn't exist

### Solution
Referenced the working implementation in `~/Projects/fineract-gitops/charts/fineract-frontends/values.yaml` to get correct image names and tags:

| App | Correct Image | Tag |
|-----|---------------|-----|
| admin | `ghcr.io/adorsys-gis/fineract-apps/admin-app` | `cac454a9` |
| account-management | `ghcr.io/adorsys-gis/fineract-apps/account-manager-app` | `cac454a9` |
| accounting | `ghcr.io/adorsys-gis/fineract-apps/accounting-app` | `cac454a9` |
| reporting | `ghcr.io/adorsys-gis/fineract-apps/reporting-app` | `cac454a9` |
| branch | `ghcr.io/adorsys-gis/fineract-apps/branch-manager-app` | `cac454a9` |
| cashier | `ghcr.io/adorsys-gis/fineract-apps/cashier-app` | `cac454a9` |
| asset | `ghcr.io/adorsys-gis/fineract-apps/asset-manager-app` | `cac454a9` |
| portal | `nginx` | `1.27.3-alpine` (public image) |

---

## Issue 18: Deployment Strategy - RollingUpdate vs Recreate

### Problem
With the default `RollingUpdate` strategy, old ReplicaSets with incorrect configurations were still creating pods alongside new ones, causing confusion and resource waste.

### Solution
Added `Recreate` deployment strategy to all UI deployments to ensure clean rollouts:

```yaml
spec:
  replicas: {{ .Values.admin.replicaCount | default .Values.ui.replicaCount }}
  strategy:
    type: Recreate
  selector:
```

**Note:** Recreate strategy causes brief downtime during deployments but ensures clean state. For production environments with multiple replicas, RollingUpdate with proper probe configuration is recommended.

---

## Summary of Wave 7 Files Modified

| File | Changes |
|------|---------|
| `helm/values/dev/fineract-ui-stack-values.yaml` | Created new values file for local dev |
| `helm/charts/fineract-ui-stack/templates/*/configmap.yaml` (8 files) | Conditional HTTP/HTTPS redirectUri |
| `helm/charts/fineract-ui-stack/templates/*/ingress.yaml` (8 files) | Conditional TLS and cert-manager annotations |
| `helm/charts/fineract-ui-stack/templates/*/deployment.yaml` (8 files) | imagePullSecrets support, Recreate strategy |

---

## Wave 7 Deployment Commands

### Prerequisites

1. **Create registry credentials secret (one-time):**
```bash
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-github-token> \
  -n fineract
```

2. **Update /etc/hosts:**
```bash
# Get the ingress IP (adjust based on your cluster)
INGRESS_IP="192.168.1.200"  # Replace with your cluster IP

# Add host entries
echo "$INGRESS_IP fineract.local auth.fineract.local" | sudo tee -a /etc/hosts
```

### Deploy Fineract Core (Gateway)

```bash
# Deploy fineract-core with gateway
helm upgrade --install fineract-core ./helm/charts/fineract-core \
  -n fineract \
  -f helm/values/dev/fineract-core-values.yaml
```

### Deploy Fineract UI Stack

```bash
# Deploy UI stack
helm upgrade --install fineract-ui-stack ./helm/charts/fineract-ui-stack \
  -n fineract \
  -f helm/values/dev/fineract-ui-stack-values.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n fineract

# Check ingresses
kubectl get ingress -n fineract

# Check services
kubectl get svc -n fineract
```

---

## Wave 7 Access URLs

After adding to `/etc/hosts`:
```
192.168.1.200 portal.fineract.local admin.fineract.local accounts.fineract.local accounting.fineract.local reports.fineract.local branch.fineract.local cashier.fineract.local assets.fineract.local
```

| Application | URL |
|-------------|-----|
| Portal | http://portal.fineract.local |
| Admin | http://admin.fineract.local |
| Account Management | http://accounts.fineract.local |
| Accounting | http://accounting.fineract.local |
| Reporting | http://reports.fineract.local |
| Branch | http://branch.fineract.local |
| Cashier | http://cashier.fineract.local |
| Asset | http://assets.fineract.local |

---

## Lessons Learned (Wave 7)

14. **Conditional TLS configuration** - Always make TLS configurable for local development environments that may not have cert-manager or TLS certificates
15. **Private registry authentication** - Use `imagePullSecrets` for private registries; create the secret once and reference it in values
16. **Image naming conventions** - Verify actual image names and tags in the registry; don't assume naming patterns
17. **Reference working implementations** - The `~/Projects/fineract-gitops` folder provided the correct image names and tags
18. **Deployment strategy choice** - Use Recreate for dev environments with single replicas; RollingUpdate for production with proper probes
19. **ConfigMap protocol handling** - OAuth redirect URIs must match the actual protocol (HTTP/HTTPS) used by the application

---

## Issue 13: Portal Not Redirecting to Apps (Wave 7)

### Problem
The portal landing page was not redirecting to frontend apps when clicked. The portal links used paths like `/administration`, `/cashier`, etc., but each app had its own separate ingress.

### Analysis
The reference implementation uses a **single gateway** that routes all frontend apps via path-based routing with OAuth2 authentication. The gateway handles:
- OAuth2-Proxy endpoints (`/oauth2/start`, `/oauth2/`, `/oauth2/auth`)
- Static assets routing (bypass auth)
- Frontend apps routing with OAuth2 auth
- Fineract API routing (preserving read/write/batch functionality)
- Portal home page routing (public)

### Solution
Updated the gateway configuration to include frontend app routing:

1. **Created nginx configuration files:**
   - `helm/charts/fineract-core/files/nginx/gateway.conf` - Main gateway config with path-based routing
   - `helm/charts/fineract-core/files/nginx/oauth2-auth-cookie.conf` - OAuth2 cookie forwarding
   - `helm/charts/fineract-core/files/nginx/security-headers.conf` - Security headers for public locations

2. **Updated ConfigMap template** (`helm/charts/fineract-core/templates/gateway/configmap.yaml`):
   - Uses `.Files.Get` to load nginx config files
   - Templates variables: `KUBE_DNS_RESOLVER`, `KUBE_NAMESPACE`, `KEYCLOAK_PUBLIC_URL`, `GATEWAY_EXTERNAL_URL_ENCODED`

3. **Updated Deployment template** (`helm/charts/fineract-core/templates/gateway/deployment.yaml`):
   - Mounts gateway.conf as `/etc/nginx/conf.d/default.conf`
   - Mounts include files at `/etc/nginx/includes/`
   - Added nginx-exporter sidecar for Prometheus metrics
   - Added proper security context

4. **Updated Ingress template** (`helm/charts/fineract-core/templates/gateway/ingress.yaml`):
   - Routes directly to gateway service on port 80
   - Gateway handles OAuth2-Proxy routing internally

5. **Updated values files:**
   - Added `global.keycloakPublicUrl` for logout redirect
   - Added `gateway.dnsResolver` for kube-dns resolution
   - Added `gateway.port` and `gateway.hpa` configuration
   - Added `oauth2Proxy.externalUrl` for OAuth2 redirect URL
   - Added `oauth2Proxy.cookie` settings for session management

### Files Modified

| File | Changes |
|------|---------|
| `helm/charts/fineract-core/files/nginx/gateway.conf` | Created - Complete gateway routing config |
| `helm/charts/fineract-core/files/nginx/oauth2-auth-cookie.conf` | Created - OAuth2 cookie forwarding |
| `helm/charts/fineract-core/files/nginx/security-headers.conf` | Created - Security headers |
| `helm/charts/fineract-core/templates/gateway/configmap.yaml` | Updated to use new nginx files |
| `helm/charts/fineract-core/templates/gateway/deployment.yaml` | Updated volume mounts, added exporter |
| `helm/charts/fineract-core/templates/gateway/ingress.yaml` | Updated to route to gateway directly |
| `helm/values/dev/fineract-core-values.yaml` | Added gateway and OAuth2 proxy config |

### Gateway Routing Configuration

The gateway now handles the following routes:

| Path | Backend | Auth |
|------|---------|------|
| `/oauth2/start` | oauth2-proxy:4180 | Public |
| `/oauth2/` | oauth2-proxy:4180 | Public |
| `/oauth2/auth` | oauth2-proxy:4180 | Internal |
| `/cashier/` | fineract-ui-stack-cashier:80 | OAuth2 |
| `/accounting/` | fineract-ui-stack-accounting:80 | OAuth2 |
| `/reporting/` | fineract-ui-stack-reporting:80 | OAuth2 |
| `/administration/` | fineract-ui-stack-admin:80 | OAuth2 |
| `/account/` | fineract-ui-stack-account-management:80 | OAuth2 |
| `/branch/` | fineract-ui-stack-branch:80 | OAuth2 |
| `/asset-manager/` | fineract-ui-stack-asset:80 | OAuth2 |
| `/fineract-provider/api` | fineract-core-read/write:8080 | OAuth2 |
| `/home/` | fineract-ui-stack-portal:80 | Public |
| `/` | Redirect to `/home/` | Public |

### Deployment Commands

```bash
# Deploy fineract-core with updated gateway
helm upgrade --install fineract-core ./helm/charts/fineract-core \
  -n fineract \
  -f helm/values/dev/fineract-core-values.yaml

# Update /etc/hosts (single entry for gateway)
echo "192.168.1.200 fineract.local auth.fineract.local" | sudo tee -a /etc/hosts
```

### Access URLs (After Gateway Update)

| Application | URL |
|-------------|-----|
| Portal (Public) | http://fineract.local/home/ |
| Admin | http://fineract.local/administration/ |
| Account Management | http://fineract.local/account/ |
| Accounting | http://fineract.local/accounting/ |
| Reporting | http://fineract.local/reporting/ |
| Branch | http://fineract.local/branch/ |
| Cashier | http://fineract.local/cashier/ |
| Asset Manager | http://fineract.local/asset-manager/ |
| Fineract API | http://fineract.local/fineract-provider/api |
| Keycloak | http://auth.fineract.local |

---

## Lessons Learned (Wave 7 - Gateway)

20. **Single gateway pattern** - Use a single gateway with path-based routing for all frontend apps instead of separate ingresses per app
21. **OAuth2-Proxy integration** - The gateway uses `auth_request` directive to check authentication with OAuth2-Proxy
22. **SPA base href** - Use nginx `sub_filter` to inject `<base href="/path/">` for subpath routing
23. **Static assets bypass** - Static assets (JS, CSS, images) bypass auth for performance
24. **Read/Write/Batch routing** - Fineract API routes GET to read service, POST/PUT/DELETE/PATCH to write service
25. **DNS resolver** - Use kube-dns resolver for dynamic upstream resolution in nginx
