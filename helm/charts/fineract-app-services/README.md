# Fineract App Services Helm Chart

An umbrella chart that deploys all Fineract application services for the OM Platform.

## Overview

This chart bundles the following services:
- **Payment Gateway** - Payment processing with MTN MoMo, Orange Money, CinetPay, Nokash
- **Asset Service** - Digital asset management with GL accounts, tax configuration
- **Customer Self-Service** - Customer registration and KYC management
- **SMS Gateway** - SMS messaging via AvlyText and Orange SMS

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │           Ingress / API Gateway             │
                    └─────────────────────┬───────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
┌───────▼───────┐  ┌──────────────────────▼──────────────────────┐  ┌───────▼───────┐
│    Payment    │  │              Asset Service                 │  │   Customer    │
│    Gateway    │  │  ┌─────────────────────────────────────┐   │  │  Self-Service │
│   (Java)      │  │  │ GL Accounts | Tax | Market Hours   │   │  │    (Java)     │
│   Port: 8082  │  │  └─────────────────────────────────────┘   │  │   Port: 8080  │
└───────┬───────┘  └───────────────────┬─────────────────────────┘  └───────┬───────┘
        │                               │                                    │
        │         ┌─────────────────────┼────────────────────────────────────┘
        │         │                     │
        │  ┌──────▼──────┐       ┌──────▼──────┐
        │  │     SMS     │       │  Fineract   │
        │  │   Gateway   │       │   Core      │
        │  │   (Rust)    │       │  Banking    │
        │  │  Port: 8080 │       └──────┬──────┘
        │  └──────┬──────┘              │
        │         │                     │
        └─────────┼─────────────────────┼──────────────────────┐
                  │                     │                      │
          ┌───────▼───────┐     ┌───────▼───────┐      ┌───────▼───────┐
          │   PostgreSQL  │     │    Redis      │      │   Keycloak    │
          │   (Data)      │     │   (Cache)     │      │   (Auth)      │
          └───────────────┘     └───────────────┘      └───────────────┘
```

## Requirements

### Dependencies
- Kubernetes >= 1.23
- Helm >= 3.0
- PostgreSQL database
- Redis cache
- Keycloak OAuth2 server
- MinIO (optional, for document storage)

### Subchart Dependencies
The umbrella chart includes the following subcharts:
- `payment-gateway` (0.1.0)
- `asset-service` (0.1.0)
- `customer-self-service` (0.1.0)
- `sms-gateway` (0.1.0)

## Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/skyengpro/om.git
cd om

# Update dependencies
helm dependency update helm/charts/fineract-app-services

# Install with default values (development)
helm install fineract-apps helm/charts/fineract-app-services \
  --namespace fineract --create-namespace

# Install with custom values
helm install fineract-apps helm/charts/fineract-app-services \
  -f values-dev.yaml \
  --namespace fineract --create-namespace
```

### Production Installation

```bash
# Install with production values
helm install fineract-apps helm/charts/fineract-app-services \
  -f values-prod.yaml \
  --namespace fineract --create-namespace
```

## Configuration

### Global Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imagePullSecrets` | Image pull secrets | `[]` |
| `global.keycloakUrl` | Keycloak internal URL | `http://keycloak:8080` |
| `global.keycloakPublicUrl` | Keycloak public URL | `http://localhost:8180` |
| `global.realm` | Keycloak realm | `fineract` |
| `global.fineractUrl` | Fineract core URL | `https://fineract:8443` |
| `global.otelEndpoint` | OpenTelemetry endpoint | `http://otel-collector:4317` |
| `global.storage.endpoint` | MinIO/S3 endpoint | `http://minio:9000` |
| `global.storage.bucket` | Storage bucket | `fineract-assets` |
| `global.postgres.host` | PostgreSQL host | `postgres` |
| `global.postgres.port` | PostgreSQL port | `5432` |
| `global.redis.host` | Redis host | `redis` |
| `global.redis.port` | Redis port | `6379` |

### Service Enablement

| Parameter | Description | Default |
|-----------|-------------|---------|
| `paymentGateway.enabled` | Enable Payment Gateway | `true` |
| `assetService.enabled` | Enable Asset Service | `true` |
| `customerSelfService.enabled` | Enable Customer Self-Service | `true` |
| `smsGateway.enabled` | Enable SMS Gateway | `true` |

### Secrets Management

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets.mode` | Secret mode (`generate` or `existing`) | `generate` |
| `paymentGateway.existingSecret` | Existing secret for Payment Gateway | `""` |
| `assetService.existingSecret` | Existing secret for Asset Service | `""` |
| `customerSelfService.existingSecret` | Existing secret for Customer Self-Service | `""` |
| `smsGateway.existingSecret` | Existing secret for SMS Gateway | `""` |

## Environment-Specific Values

### Development (values-dev.yaml)

```yaml
global:
  keycloakUrl: "http://keycloak:8080"
  storage:
    endpoint: "http://minio:9000"

secrets:
  mode: generate

paymentGateway:
  replicaCount: 1
  resources:
    requests:
      memory: "128Mi"
      cpu: "50m"

assetService:
  replicaCount: 1
  permitAllAdmin: true

customerSelfService:
  replicaCount: 1

smsGateway:
  replicaCount: 1
```

### Production (values-prod.yaml)

```yaml
global:
  keycloakUrl: "http://keycloak.production.svc.cluster.local:8080"
  storage:
    endpoint: "https://s3.amazonaws.com"
    bucket: "fineract-prod-assets"

secrets:
  mode: existing

paymentGateway:
  replicaCount: 2
  existingSecret: payment-gateway-secrets
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

assetService:
  replicaCount: 2
  existingSecret: asset-service-secrets
  permitAllAdmin: false
  fullJit: true
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5

customerSelfService:
  replicaCount: 2
  existingSecret: customer-self-service-secrets
  autoscaling:
    enabled: true

smsGateway:
  replicaCount: 2
  existingSecret: sms-gateway-secrets
  autoscaling:
    enabled: true
```

## Sealed Secrets Integration

For production, use sealed-secrets for secure credential management:

```bash
# Create sealed secret for payment gateway
kubectl create secret generic payment-gateway-secrets \
  --from-literal=database-password=<password> \
  --from-literal=keycloak-client-secret=<secret> \
  --from-literal=mtn-api-key=<key> \
  --namespace=fineract \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret.yaml

# Apply the sealed secret
kubectl apply -f sealed-secret.yaml
```

Then reference in values:

```yaml
paymentGateway:
  existingSecret: payment-gateway-secrets
```

## Health Endpoints

All services expose health endpoints:

| Service | Health | Liveness | Readiness |
|---------|--------|----------|-----------|
| Payment Gateway | `/actuator/health` | `/actuator/health/liveness` | `/actuator/health/readiness` |
| Asset Service | `/actuator/health` | `/actuator/health/liveness` | `/actuator/health/readiness` |
| Customer Self-Service | `/actuator/health` | `/actuator/health/liveness` | `/actuator/health/readiness` |
| SMS Gateway | `/health` | `/ready` | N/A |

## Troubleshooting

### Check Pod Status

```bash
# List all pods
kubectl get pods -l app.kubernetes.io/instance=fineract-apps -n fineract

# Check specific service logs
kubectl logs -l app.kubernetes.io/component=payment-gateway -n fineract -f

# Describe a pod for events
kubectl describe pod <pod-name> -n fineract
```

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check NetworkPolicy allows egress
   - Verify credentials in secrets

2. **Keycloak Authentication Failed**
   - Verify Keycloak is accessible
   - Check client ID and secret
   - Verify realm configuration

3. **Service Not Starting**
   - Check resource limits
   - Review JVM options
   - Check init container logs

### Debug Mode

```bash
# Run with debug logging
helm upgrade fineract-apps helm/charts/fineract-app-services \
  --set paymentGateway.javaOpts="-Xmx256m -Xms128m -Dlogging.level.root=DEBUG" \
  -n fineract
```

## Migration from ADORSYS-GIS

This chart is adapted from the ADORSYS-GIS fineract-gitops platform chart with:
- Modular subchart architecture
- Sealed-secrets support
- HPA and PDB for all services
- NetworkPolicy for security
- OM platform packaging standards

## License

Apache 2.0

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.
