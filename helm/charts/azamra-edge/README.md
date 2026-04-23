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
- PostgreSQL with `user_storage` database (Wave 4)
- Redis for session caching (Wave 2)
- MinIO for document storage (Wave 4)
- Downstream services: Customer-Self-Service, Asset-Service, Payment-Gateway (Wave 5)

## Installation

### Local Development

```bash
# Install with default values
helm install azamra-edge ./helm/charts/azamra-edge -n fineract --create-namespace

# Install with custom values
helm install azamra-edge ./helm/charts/azamra-edge -n fineract -f values-dev.yaml
```

### Production

```bash
# Create namespace
kubectl create namespace fineract

# Install with production values
helm install azamra-edge ./helm/charts/azamra-edge -n fineract -f values-prod.yaml
```

## Configuration

### Global Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.keycloakUrl` | Internal Keycloak URL | `http://keycloak:8080` |
| `global.keycloakPublicUrl` | Public Keycloak URL | `http://localhost:8180` |
| `global.realm` | Keycloak realm | `fineract` |
| `global.otelEndpoint` | OpenTelemetry collector endpoint | `http://otel-collector:4317` |
| `networkPolicies.enabled` | Enable network policies | `true` |

### Azamra BFF

| Parameter | Description | Default |
|-----------|-------------|---------|
| `azamraBff.enabled` | Enable BFF service | `true` |
| `azamraBff.image.repository` | Image repository | `ghcr.io/skyengpro/azamra-tokenization-bff` |
| `azamraBff.image.tag` | Image tag | `latest` |
| `azamraBff.port` | Service port | `8080` |
| `azamraBff.replicas` | Replica count | `1` |
| `azamraBff.services.assetServiceUrl` | Asset Service URL | `http://asset-service:8083/api/v1` |
| `azamraBff.services.cussUrl` | Customer Self Service URL | `http://customer-self-service:8080` |
| `azamraBff.services.userStorageUrl` | User Storage URL | `http://user-storage:3000/bff` |
| `azamraBff.services.paymentGatewayUrl` | Payment Gateway URL | `http://payment-gateway-service:8082` |
| `azamraBff.redis.host` | Redis host | `redis` |
| `azamraBff.redis.existingSecret` | Existing secret for Redis password | `""` |

### KYC Manager

| Parameter | Description | Default |
|-----------|-------------|---------|
| `kycManager.enabled` | Enable KYC Manager | `true` |
| `kycManager.image.repository` | Image repository | `ghcr.io/skyengpro/azamra-tokenization-frontend-kyc-mgr` |
| `kycManager.image.tag` | Image tag | `latest` |
| `kycManager.port` | Service port | `3000` |
| `kycManager.replicas` | Replica count | `1` |
| `kycManager.nextAuthUrl` | NextAuth URL (required for production) | `""` |
| `kycManager.oauth2.clientId` | Keycloak client ID | `kyc-manager` |
| `kycManager.existingSecret` | Existing secret for OAuth2 credentials | `""` |

### User Storage

| Parameter | Description | Default |
|-----------|-------------|---------|
| `userStorage.enabled` | Enable User Storage | `true` |
| `userStorage.image.repository` | Image repository | `ghcr.io/adorsys-gis/user-storage` |
| `userStorage.image.tag` | Image tag | `latest` |
| `userStorage.port` | Service port | `3000` |
| `userStorage.replicas` | Replica count | `1` |
| `userStorage.database.url` | PostgreSQL connection URL | `postgres://user_storage:...@postgres:5432/user_storage` |
| `userStorage.redis.url` | Redis connection URL | `redis://redis:6379` |
| `userStorage.minio.endpoint` | MinIO endpoint | `http://minio:9000` |
| `userStorage.minio.bucket` | MinIO bucket | `user-storage-dev` |
| `userStorage.existingSecret` | Existing secret for credentials | `""` |

## Ingress Configuration

Enable ingress for external access:

```yaml
azamraBff:
  ingress:
    enabled: true
    className: nginx
    host: bff.azamra.example.com
    tls:
      enabled: true
      secretName: bff-tls

kycManager:
  ingress:
    enabled: true
    className: nginx
    host: kyc.azamra.example.com
    tls:
      enabled: true
      secretName: kyc-tls
```

## Secrets Management

### Using Sealed Secrets

1. Create sealed secrets for production:

```bash
# KYC Manager credentials
kubectl create secret generic kyc-manager-credentials \
  --from-literal=NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  --from-literal=OAUTH2_CLIENT_SECRET=<keycloak-client-secret> \
  --namespace=fineract --dry-run=client -o yaml | kubeseal -o yaml > kyc-manager-sealed.yaml

# User Storage credentials
kubectl create secret generic user-storage-credentials \
  --from-literal=USER_STORAGE_DB_PASSWORD=<db-password> \
  --namespace=fineract --dry-run=client -o yaml | kubeseal -o yaml > user-storage-sealed.yaml
```

2. Reference in values:

```yaml
kycManager:
  existingSecret: "kyc-manager-credentials"

userStorage:
  existingSecret: "user-storage-credentials"
  redis:
    existingSecret: "fineract-redis-credentials"
  minio:
    existingSecret: "data-store-minio"
```

## Network Policies

When `networkPolicies.enabled: true`, the chart creates network policies that:

- Allow ingress traffic from the ingress controller
- Allow inter-service communication within the namespace
- Allow egress to:
  - Keycloak (OIDC/OAuth2)
  - PostgreSQL (database)
  - Redis (session cache)
  - MinIO (document storage)
  - Downstream services (Asset Service, CUSS, Payment Gateway)
  - OpenTelemetry collector (tracing)

## Health Checks

All services expose health endpoints:

- **Azamra BFF**: `/actuator/health`
- **KYC Manager**: `/api/health`
- **User Storage**: `/health`

## Verification

```bash
# Check pods are running
kubectl get pods -n fineract -l app.kubernetes.io/managed-by=Helm

# Check BFF health
kubectl exec -n fineract deploy/azamra-bff -- curl -s http://localhost:8080/actuator/health

# Check User Storage health
kubectl exec -n finerect deploy/user-storage -- curl -s http://localhost:3000/health

# Verify Redis session caching
kubectl exec -n fineract deploy/redis -- redis-cli keys '*'
```

## Dependencies

This chart depends on services from previous waves:

| Wave | Service | Purpose |
|------|---------|---------|
| 1 | Keycloak | OIDC/OAuth2 authentication |
| 2 | Redis | Session caching |
| 4 | PostgreSQL | User storage database |
| 4 | MinIO | Document storage |
| 5 | Customer-Self-Service | Customer onboarding |
| 5 | Asset-Service | Asset management |
| 5 | Payment-Gateway | Payment processing |

## Upgrading

```bash
helm upgrade azamra-edge ./helm/charts/azamra-edge -n fineract -f values-prod.yaml
```

## Uninstalling

```bash
helm uninstall azamra-edge -n fineract
```

## License

Apache 2.0
