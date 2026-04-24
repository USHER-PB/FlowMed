# Customer Self-Service Helm Chart

A Helm chart for deploying the Customer Self-Service on Kubernetes.

## Overview

The Customer Self-Service handles customer-facing operations for the Fineract platform:

- **Customer Registration** - New customer onboarding
- **KYC Verification** - Know Your Customer compliance
- **Self-Service Portal** - Customer account management
- **Document Management** - Identity document handling

## Prerequisites

- Kubernetes 1.23+
- Helm 3.0+
- PostgreSQL database
- Fineract core service
- Keycloak (for OAuth2 authentication)
- Optional: Redis for caching

## Installation

### Using Helm directly

```bash
helm install customer-self-service ./helm/charts/customer-self-service \
  --namespace fineract \
  --create-namespace \
  -f values.yaml
```

### Using with sealed-secrets

1. Create the sealed-secret for credentials:

```bash
kubectl create secret generic customer-self-service-credentials \
  --namespace fineract \
  --from-literal=db-password=<db-password> \
  --from-literal=keycloak-client-secret=<client-secret> \
  --from-literal=fineract-password=<fineract-password> \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret.yaml
```

2. Apply the sealed-secret:

```bash
kubectl apply -f sealed-secret.yaml
```

3. Install the chart with existing secret:

```bash
helm install customer-self-service ./helm/charts/customer-self-service \
  --namespace fineract \
  --set existingSecret=customer-self-service-credentials
```

## Configuration

### Key Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.registry` | Image registry | `ghcr.io` |
| `image.repository` | Image repository | `adorsys-gis/fineract-apps/customer-self-service` |
| `image.tag` | Image tag | `latest` |
| `service.port` | Service port | `8080` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.database.host` | PostgreSQL host | `postgres` |
| `config.database.port` | PostgreSQL port | `5432` |
| `config.database.url` | JDBC URL | `jdbc:postgresql://postgres:5432/customer_self_service` |
| `config.database.username` | Database username | `customer_self_service` |
| `config.database.password` | Database password (use sealed-secret) | `""` |

### Keycloak Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.keycloak.url` | Keycloak URL | `http://keycloak:8080` |
| `config.keycloak.realm` | Keycloak realm | `master` |
| `config.keycloak.clientId` | OAuth2 client ID | `customer-registration` |
| `config.keycloak.clientSecret` | OAuth2 client secret (use sealed-secret) | `""` |

### Self-Service Configuration

```yaml
config:
  selfService:
    defaultOfficeId: "<office-id>"
    defaultGroupPath: "/customers"
    defaultKycTier: "1"
    defaultKycStatus: "pending"
```

### Resource Configuration

```yaml
resources:
  requests:
    memory: "160Mi"
    cpu: "50m"
  limits:
    memory: "320Mi"
    cpu: "250m"
```

### Autoscaling

```yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80
```

## Health Endpoints

- **Liveness**: `/actuator/health/liveness`
- **Readiness**: `/actuator/health/readiness`
- **Health**: `/actuator/health`
- **Prometheus Metrics**: `/actuator/prometheus`

## Dependencies

This service depends on:

- **Wave 0**: Keycloak (identity provider)
- **Wave 1**: PostgreSQL (database)
- **Wave 4**: Fineract Core (core banking)

## Security

- Runs as non-root user (UID 1000)
- Read-only root filesystem
- Seccomp profile enabled
- Network policies for traffic control
- Secrets managed via sealed-secrets

## Troubleshooting

### Check pod logs

```bash
kubectl logs -n fineract -l app.kubernetes.io/name=customer-self-service
```

### Check health status

```bash
kubectl exec -n fineract deploy/customer-self-service -- curl -s http://localhost:8080/actuator/health
```

### Check database connectivity

```bash
kubectl exec -n fineract deploy/customer-self-service -- nc -zv postgres 5432
```

## License

Apache 2.0
