# SMS Gateway Helm Chart

A Helm chart for deploying the SMS Gateway service on Kubernetes. This is a Rust-based service that provides SMS messaging capabilities through multiple providers.

## Overview

The SMS Gateway service handles SMS message routing and delivery through various SMS providers. It supports:
- **AvlyText**: Primary SMS provider
- **Orange SMS**: Alternative SMS provider for Orange network

This chart deploys the SMS Gateway with:
- Deployment with configurable replicas and resource limits
- Service for cluster-internal communication
- ConfigMap for application configuration
- Secret for provider credentials
- HorizontalPodAutoscaler for automatic scaling
- PodDisruptionBudget for high availability
- NetworkPolicy for traffic control

## Requirements

### Dependencies
- Kubernetes >= 1.23
- Helm >= 3.0
- PostgreSQL (for user storage)
- MinIO (for SMS storage, optional)

### Infrastructure
- PostgreSQL database deployed and accessible
- MinIO object storage (optional, for SMS archiving)

## Installation

### Using the Chart

```bash
# Add the OM charts repository
helm repo add om-charts https://om-platform.github.io/charts

# Install with default values
helm install sms-gateway om-charts/sms-gateway

# Install with custom values
helm install sms-gateway om-charts/sms-gateway -f values.yaml
```

### Using as a Subchart

Add to your `Chart.yaml`:

```yaml
dependencies:
  - name: sms-gateway
    version: "0.1.0"
    repository: "file://../sms-gateway"
```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Image repository | `ghcr.io/om-platform/sms-gateway` |
| `image.tag` | Image tag | `""` (defaults to appVersion) |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `8080` |

### Application Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.database.host` | PostgreSQL host | `postgres` |
| `config.database.port` | PostgreSQL port | `5432` |
| `config.database.name` | Database name | `user_storage` |
| `config.storage.endpoint` | MinIO endpoint | `http://minio:9000` |
| `config.storage.bucket` | Storage bucket | `sms-storage` |
| `config.sms.provider` | Default SMS provider | `avlytext` |

### SMS Provider Configuration

#### AvlyText Provider

| Parameter | Description | Default |
|-----------|-------------|---------|
| `providers.avlytext.enabled` | Enable AvlyText | `true` |
| `providers.avlytext.baseUrl` | API base URL | `https://api.avlytext.com` |
| `providers.avlytext.apiKey` | API key (use existingSecret) | `""` |
| `providers.avlytext.senderId` | Sender ID | `OMPlatform` |

#### Orange SMS Provider

| Parameter | Description | Default |
|-----------|-------------|---------|
| `providers.orange.enabled` | Enable Orange SMS | `false` |
| `providers.orange.baseUrl` | API base URL | `https://api.orange.com/sms` |
| `providers.orange.clientId` | OAuth client ID | `""` |
| `providers.orange.clientSecret` | OAuth client secret | `""` |
| `providers.orange.senderId` | Sender ID | `OMPlatform` |

### Resource Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.requests.cpu` | CPU request | `50m` |
| `resources.requests.memory` | Memory request | `64Mi` |
| `resources.limits.cpu` | CPU limit | `200m` |
| `resources.limits.memory` | Memory limit | `256Mi` |

### Autoscaling

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Minimum replicas | `1` |
| `autoscaling.maxReplicas` | Maximum replicas | `5` |
| `autoscaling.targetCPUUtilizationPercentage` | CPU target | `70` |
| `autoscaling.targetMemoryUtilizationPercentage` | Memory target | `80` |

### Pod Disruption Budget

| Parameter | Description | Default |
|-----------|-------------|---------|
| `pdb.enabled` | Enable PDB | `true` |
| `pdb.minAvailable` | Min available pods | `1` |
| `pdb.maxUnavailable` | Max unavailable pods | `""` |

### Network Policy

| Parameter | Description | Default |
|-----------|-------------|---------|
| `networkPolicy.enabled` | Enable NetworkPolicy | `true` |
| `networkPolicy.ingress.namespaceSelector` | Allowed ingress namespaces | `app: om-platform` |
| `networkPolicy.egress.enabled` | Enable egress rules | `true` |

### Security

| Parameter | Description | Default |
|-----------|-------------|---------|
| `serviceAccount.create` | Create ServiceAccount | `true` |
| `serviceAccount.annotations` | SA annotations | `{}` |
| `podSecurityContext` | Pod security context | See values.yaml |
| `securityContext` | Container security context | See values.yaml |

### Secrets Management

| Parameter | Description | Default |
|-----------|-------------|---------|
| `existingSecret` | Use existing secret | `""` |
| `secrets.databasePassword` | Database password | `""` |
| `secrets.avlytextApiKey` | AvlyText API key | `""` |
| `secrets.orangeClientSecret` | Orange client secret | `""` |

## Health Endpoints

The SMS Gateway exposes the following health endpoints:
- `GET /health` - Overall health status
- `GET /ready` - Readiness probe
- `GET /metrics` - Prometheus metrics (optional)

## Using Sealed Secrets

For production deployments, use sealed-secrets for credential management:

```yaml
# Create a sealed secret
kubectl create secret generic sms-gateway-secrets \
  --from-literal=database-password=<db-password> \
  --from-literal=avlytext-api-key=<api-key> \
  --namespace=<namespace> \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret.yaml
```

Then reference it in values:

```yaml
existingSecret: sms-gateway-secrets
```

## Example Configuration

### Development

```yaml
# values-dev.yaml
replicaCount: 1

config:
  database:
    host: postgres.default.svc.cluster.local
    name: user_storage_dev

providers:
  avlytext:
    enabled: true
    baseUrl: https://api-test.avlytext.com

resources:
  requests:
    cpu: 25m
    memory: 32Mi
  limits:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
```

### Production

```yaml
# values-prod.yaml
replicaCount: 2

config:
  database:
    host: postgres.production.svc.cluster.local
    name: user_storage

providers:
  avlytext:
    enabled: true
    senderId: OMPlatform
  orange:
    enabled: true
    senderId: OMPlatform

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10

pdb:
  enabled: true
  minAvailable: 1

existingSecret: sms-gateway-secrets
```

## Architecture

```
                    ┌─────────────────┐
                    │   Ingress/      │
                    │   API Gateway   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   SMS Gateway    │
                    │   (Rust)         │
                    │   Port: 8080     │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼───────┐ ┌──────▼──────┐ ┌───────▼───────┐
    │   AvlyText    │ │  Orange SMS │ │   PostgreSQL  │
    │   API         │ │   API       │ │   (Storage)   │
    └───────────────┘ └─────────────┘ └───────────────┘
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running and accessible
   - Check database credentials in secret
   - Ensure NetworkPolicy allows egress to PostgreSQL

2. **SMS Provider Errors**
   - Verify API credentials are correct
   - Check provider API endpoint accessibility
   - Review provider-specific error codes in logs

3. **Health Check Failures**
   - Check pod logs: `kubectl logs <pod-name>`
   - Verify ConfigMap is mounted correctly
   - Ensure database connectivity

### Debugging

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=sms-gateway

# View logs
kubectl logs -l app.kubernetes.io/name=sms-gateway -f

# Check ConfigMap
kubectl get configmap sms-gateway-config -o yaml

# Test health endpoint
kubectl exec -it <pod-name> -- curl localhost:8080/health
```

## Migration from ADORSYS-GIS

This chart is adapted from the ADORSYS-GIS fineract-gitops SMS Gateway chart with the following changes:
- Added ConfigMap template for YAML configuration
- Added sealed-secrets support via existingSecret
- Added HPA and PDB for production readiness
- Added NetworkPolicy for security
- Aligned with OM platform packaging standards

## License

Apache 2.0

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.
