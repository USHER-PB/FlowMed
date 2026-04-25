# Azamra Edge Services Helm Chart

This chart deploys the Azamra edge services layer, which provides the Backend-for-Frontend (BFF) pattern for the Azamra mobile/web UI, KYC verification workflows, and the user storage SPI.

## Components

- **Azamra BFF** — Aggregation layer for Azamra UI (Spring Boot)
- **KYC-Manager** — Know Your Customer document/verification workflow (Next.js)
- **User-Storage (SPI)** — Keycloak User Storage Provider SPI implementation (Rust)

## Prerequisites

- Kubernetes 1.24+
- Helm 3.0+
- Keycloak deployed and configured (Wave 1)
- PostgreSQL with CNPG operator (Wave 4)
- Redis for session caching (Wave 2)
- MinIO for document storage (Wave 4)
- Downstream services: Customer-Self-Service, Asset-Service, Payment-Gateway (Wave 5)

---

## Quick Start Deployment Guide

Follow these steps to deploy Azamra Edge Services on a Kubernetes cluster.

### Step 1: Verify Prerequisites

Ensure all dependent services are running:

```bash
# Check Keycloak is running
kubectl get pods -n fineract -l app.kubernetes.io/component=keycloak

# Check PostgreSQL (CNPG) is running
kubectl get pods -n fineract -l cnpg.io/cluster=data-store-postgres

# Check Redis is running
kubectl get pods -n fineract -l app.kubernetes.io/name=redis

# Check MinIO is running
kubectl get pods -n fineract -l app=minio
```

### Step 2: Create Required Secrets

The deployment requires several secrets to be created before installation.

#### 2.1 Database Admin Credentials (for CNPG Managed Roles)

Create a SealedSecret for the database admin user that will be used by CNPG to create the `user_storage` database:

```bash
# Create the sealed secret file
cat <<EOF > configs/secrets/db-admin-credentials.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-admin-credentials
  namespace: fineract
spec:
  encryptedData:
    password: <ENCRYPTED_PASSWORD>
    username: <ENCRYPTED_USERNAME>
  template:
    type: kubernetes.io/basic-auth
EOF

# Apply to cluster
kubectl apply -f configs/secrets/db-admin-credentials.yaml -n fineract
```

#### 2.2 User Storage Credentials

Create a SealedSecret for the user-storage service database credentials:

```bash
# Create the sealed secret file
cat <<EOF > configs/secrets/user-storage-credentials.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: user-storage-credentials
  namespace: fineract
spec:
  encryptedData:
    USER_STORAGE_DB_PASSWORD: <ENCRYPTED_PASSWORD>
  template:
    type: Opaque
EOF

# Apply to cluster
kubectl apply -f configs/secrets/user-storage-credentials.yaml -n fineract
```

#### 2.3 Configure CNPG Managed Role

Add the `db_admin` managed role to the CNPG cluster:

```bash
# Patch the CNPG cluster to add the managed role
kubectl patch cluster data-store-postgres -n fineract --type=merge -p '
spec:
  managed:
    roles:
      - name: db_admin
        adminSecret:
          name: db-admin-credentials
        loginSecret:
          name: db-admin-credentials
        createDB: true
        createrole: true
'
```

### Step 3: Configure Values

Review and customize [`values.yaml`](./values.yaml) for your environment. Key configurations:

```yaml
# Global settings
global:
  imagePullSecrets:
    - name: ghcr-credentials
  keycloakUrl: "http://keycloak:8080"
  keycloakPublicUrl: "http://auth.fineract.local"
  realm: fineract

# User Storage settings
userStorage:
  enabled: true
  initDatabase:
    enabled: true  # Creates user_storage database via init-db-job
  image:
    repository: ghcr.io/adorsys-gis/user-storage
    tag: "master"
  existingSecret: "user-storage-credentials"
  redis:
    existingSecret: "infra-cache-redis-auth"
  minio:
    existingSecret: "data-store-minio"
```

### Step 4: Install the Chart

```bash
# Install with default values
helm install azamra-edge ./helm/charts/azamra-edge -n fineract

# Or install with custom values file
helm install azamra-edge ./helm/charts/azamra-edge -n fineract -f custom-values.yaml
```

### Step 5: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n fineract -l 'app in (user-storage, azamra-bff, azamra-kyc-manager)'

# Expected output:
# NAME                                READY   STATUS    RESTARTS   AGE
# azamra-bff-xxx                      1/1     Running   0          2m
# azamra-kyc-manager-xxx              1/1     Running   0          2m
# user-storage-xxx                    1/1     Running   0          2m

# Check services
kubectl get svc -n fineract -l 'app in (user-storage, azamra-bff, azamra-kyc-manager)'

# Check ingresses
kubectl get ingress -n fineract
```

### Step 6: Test Endpoints

```bash
# Test User Storage health endpoint
kubectl run tmp-test --rm -i --restart=Never --image=curlimages/curl:latest \
  -n fineract -- curl -s http://user-storage:3000/health

# Test KYC Manager
kubectl run tmp-test --rm -i --restart=Never --image=curlimages/curl:latest \
  -n fineract -- curl -s http://azamra-kyc-manager:3000/api/health

# Test BFF (from inside cluster)
kubectl run tmp-test --rm -i --restart=Never --image=curlimages/curl:latest \
  -n fineract -- curl -s http://azamra-bff:8080/actuator/health
```

### Step 7: Access Services via Ingress

Add entries to your `/etc/hosts` file (or DNS server):

```
<INGRESS_IP> bff.fineract.local
<INGRESS_IP> kyc.fineract.local
```

Get the ingress IP:

```bash
kubectl get ingress -n fineract -o jsonpath='{.items[*].status.loadBalancer.ingress[0].ip}'
```

Access the services:
- **BFF**: http://bff.fineract.local
- **KYC Manager**: http://kyc.fineract.local

---

## Configuration Reference

### Global Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imagePullSecrets` | Image pull secrets for private registries | `[{name: ghcr-credentials}]` |
| `global.keycloakUrl` | Internal Keycloak URL | `http://keycloak:8080` |
| `global.keycloakPublicUrl` | Public Keycloak URL | `http://auth.fineract.local` |
| `global.realm` | Keycloak realm | `fineract` |
| `global.otelEndpoint` | OpenTelemetry collector endpoint | `http://otel-collector:4317` |
| `networkPolicies.enabled` | Enable network policies | `true` |

### Azamra BFF

| Parameter | Description | Default |
|-----------|-------------|---------|
| `azamraBff.enabled` | Enable BFF service | `true` |
| `azamraBff.image.repository` | Image repository | `ghcr.io/skyengpro/azamra-tokenization-bff` |
| `azamraBff.image.tag` | Image tag | `develop-amd` |
| `azamraBff.port` | Service port | `8080` |
| `azamraBff.replicas` | Replica count | `1` |
| `azamraBff.services.userStorageUrl` | User Storage URL | `http://user-storage:3000/bff` |
| `azamraBff.redis.existingSecret` | Redis auth secret | `infra-cache-redis-auth` |

### KYC Manager

| Parameter | Description | Default |
|-----------|-------------|---------|
| `azamraKycManager.enabled` | Enable KYC Manager | `true` |
| `azamraKycManager.image.repository` | Image repository | `ghcr.io/skyengpro/azamra-tokenization-frontend-kyc-mgr` |
| `azamraKycManager.image.tag` | Image tag | `latest-amd` |
| `azamraKycManager.port` | Service port | `3000` |
| `azamraKycManager.replicas` | Replica count | `1` |
| `azamraKycManager.existingSecret` | OAuth2 credentials secret | `kyc-manager-credentials` |

### User Storage

| Parameter | Description | Default |
|-----------|-------------|---------|
| `userStorage.enabled` | Enable User Storage | `true` |
| `userStorage.initDatabase.enabled` | Enable init-db-job | `true` |
| `userStorage.image.repository` | Image repository | `ghcr.io/adorsys-gis/user-storage` |
| `userStorage.image.tag` | Image tag | `master` |
| `userStorage.port` | Service port | `3000` |
| `userStorage.replicas` | Replica count | `1` |
| `userStorage.existingSecret` | Database credentials secret | `user-storage-credentials` |
| `userStorage.redis.existingSecret` | Redis auth secret | `infra-cache-redis-auth` |
| `userStorage.minio.existingSecret` | MinIO credentials secret | `data-store-minio` |

---

## Ingress Configuration

Enable ingress for external access:

```yaml
azamraBff:
  ingress:
    enabled: true
    className: nginx
    host: bff.fineract.local
    tls:
      enabled: false

azamraKycManager:
  ingress:
    enabled: true
    className: nginx
    host: kyc.fineract.local
    tls:
      enabled: false
```

---

## Secrets Management

### Required Secrets

| Secret Name | Keys | Purpose |
|-------------|------|---------|
| `db-admin-credentials` | `username`, `password` | CNPG managed role for DB creation |
| `user-storage-credentials` | `USER_STORAGE_DB_PASSWORD` | User storage database password |
| `infra-cache-redis-auth` | `redis-password` | Redis authentication (from infra-cache) |
| `data-store-minio` | `root-user`, `root-password` | MinIO credentials |
| `kyc-manager-credentials` | `NEXTAUTH_SECRET`, `OAUTH2_CLIENT_SECRET` | KYC Manager OAuth2 |

### Creating Sealed Secrets

```bash
# Install kubeseal if not already installed
go install github.com/bitnami-labs/sealed-secrets/cmd/kubeseal@latest

# Create a sealed secret
kubectl create secret generic my-secret \
  --from-literal=KEY=value \
  --namespace=fineract --dry-run=client -o yaml | \
  kubeseal -o yaml > configs/secrets/my-secret.yaml
```

---

## Network Policies

When `networkPolicies.enabled: true`, the chart creates network policies that:

- Allow ingress traffic from the ingress controller
- Allow inter-service communication within the namespace
- Allow egress to:
  - DNS (port 53 UDP/TCP)
  - Keycloak (OIDC/OAuth2)
  - PostgreSQL (port 5432)
  - Redis (port 6379)
  - MinIO (port 9000)
  - External HTTPS (port 443)

---

## Health Checks

All services expose health endpoints:

| Service | Health Endpoint | Description |
|---------|-----------------|-------------|
| Azamra BFF | `/actuator/health` | Spring Boot actuator |
| KYC Manager | `/api/health` | Next.js health check |
| User Storage | `/health` | Rust health endpoint |

---

## Troubleshooting

### Common Issues

#### 1. Init Container Stuck (wait-for-postgres)

**Symptom**: Pod stuck at `Init:0/3` with `waiting for postgres`

**Solution**: Check network policy allows egress to PostgreSQL pods:

```bash
# Check network policy
kubectl get networkpolicy allow-user-storage-external -n fineract -o yaml

# Verify the pod selector matches CNPG pods
kubectl get pods -n fineract -l cnpg.io/cluster=data-store-postgres
```

#### 2. DNS Resolution Failure

**Symptom**: `nc: bad address 'user-storage'` in init containers

**Solution**: Ensure DNS egress is allowed in network policies:

```yaml
egress:
  - to:
      - namespaceSelector: {}
    ports:
      - protocol: UDP
        port: 53
      - protocol: TCP
        port: 53
```

#### 3. Secret Key Not Found

**Symptom**: `Error: couldn't find key REDIS_PASSWORD in Secret`

**Solution**: Verify secret keys match expected values:

```bash
# Check secret keys
kubectl get secret infra-cache-redis-auth -n fineract -o jsonpath='{.data}' | jq 'keys'
# Expected: ["redis-password"] (lowercase with hyphen)
```

#### 4. Image Pull BackOff

**Symptom**: `ImagePullBackOff` or `ErrImagePull`

**Solution**: Verify image exists and imagePullSecrets are configured:

```bash
# Check image pull secrets
kubectl get secret ghcr-credentials -n fineract

# Verify image tag exists
curl -s -H "Authorization: Bearer <TOKEN>" \
  https://ghcr.io/v2/adorsys-gis/user-storage/manifests/master
```

---

## Dependencies

This chart depends on services from previous waves:

| Wave | Service | Purpose |
|------|---------|---------|
| 1 | Keycloak | OIDC/OAuth2 authentication |
| 2 | Redis | Session caching |
| 4 | PostgreSQL (CNPG) | User storage database |
| 4 | MinIO | Document storage |
| 5 | Customer-Self-Service | Customer onboarding |
| 5 | Asset-Service | Asset management |
| 5 | Payment-Gateway | Payment processing |

---

## Upgrading

```bash
helm upgrade azamra-edge ./helm/charts/azamra-edge -n fineract -f values.yaml
```

---

## Uninstalling

```bash
helm uninstall azamra-edge -n fineract
```

---

## License

Apache 2.0
