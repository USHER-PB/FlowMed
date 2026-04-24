# Asset Service Helm Chart

A Helm chart for deploying the Asset Service on Kubernetes.

## Overview

The Asset Service manages digital assets for the Fineract platform, including:

- **Digital Asset Management** - Investment portfolio tracking
- **GL Account Management** - SYSCOHADA-aligned accounting
- **Tax Calculations** - Cameroon/CEMAC tax compliance
- **Market Operations** - Trading hours and bond pricing
- **Storage Integration** - MinIO/S3 for document storage

## Prerequisites

- Kubernetes 1.23+
- Helm 3.0+
- PostgreSQL database
- Fineract core service
- Keycloak (for OAuth2 authentication)
- MinIO (for document storage)
- Optional: Redis for caching

## Installation

### Using Helm directly

```bash
helm install asset-service ./helm/charts/asset-service \
  --namespace fineract \
  --create-namespace \
  -f values.yaml
```

### Using with sealed-secrets

1. Create the sealed-secret for credentials:

```bash
kubectl create secret generic asset-service-credentials \
  --namespace fineract \
  --from-literal=db-password=<db-password> \
  --from-literal=keycloak-client-secret=<client-secret> \
  --from-literal=fineract-password=<fineract-password> \
  --from-literal=storage-access-key=<access-key> \
  --from-literal=storage-secret-key=<secret-key> \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret.yaml
```

2. Apply the sealed-secret:

```bash
kubectl apply -f sealed-secret.yaml
```

3. Install the chart with existing secret:

```bash
helm install asset-service ./helm/charts/asset-service \
  --namespace fineract \
  --set existingSecret=asset-service-credentials
```

## Configuration

### Key Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.registry` | Image registry | `ghcr.io` |
| `image.repository` | Image repository | `adorsys-gis/fineract-apps/asset-service` |
| `image.tag` | Image tag | `latest` |
| `service.port` | Service port | `8083` |
| `management.port` | Management/Actuator port | `8084` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.database.host` | PostgreSQL host | `postgres` |
| `config.database.port` | PostgreSQL port | `5432` |
| `config.database.url` | JDBC URL | `jdbc:postgresql://postgres:5432/asset_service` |
| `config.database.username` | Database username | `asset_service` |
| `config.database.password` | Database password (use sealed-secret) | `""` |

### GL Account Configuration

```yaml
config:
  glAccounts:
    digitalAssetInventory: "<account-code>"
    customerDigitalAssetHoldings: "<account-code>"
    transfersInSuspense: "<account-code>"
    incomeFromInterest: "<account-code>"
    feeIncome: "<account-code>"
    fundSource: "<account-code>"
    savingsControl: "<account-code>"
    platformFeePayable: "<account-code>"
    expenseAccount: "<account-code>"
  accounting:
    feeCollectionAccountExternalId: "PLATFORM-CLEARING"
```

The asset service also expects a Fineract savings account with the matching
external ID to exist and be `Active`. By default that is `PLATFORM-CLEARING`,
but you can change it here if your reference data uses a different ID.

### Tax Configuration (Cameroon/CEMAC)

```yaml
config:
  tax:
    authorityExternalId: "<authority-id>"
    registrationDutyAccountExternalId: "<account-id>"
    ircmAccountExternalId: "<account-id>"
    capitalGainsAccountExternalId: "<account-id>"
    tvaAccountExternalId: "<account-id>"
    defaultRegistrationDutyRate: "0.015"
    defaultIrcmDividendRate: "0.15"
    defaultCapitalGainsRate: "0.10"
```

### Market Hours Configuration

```yaml
config:
  marketHours:
    open: "09:00"
    close: "17:00"
    weekendTradingEnabled: false
```

### Storage Configuration

```yaml
config:
  storage:
    endpoint: "http://minio:9000"
    region: "default"
    bucket: "assets"
    # Secrets via sealed-secret:
    # accessKey, secretKey
```

### Resource Configuration

```yaml
resources:
  requests:
    memory: "320Mi"
    cpu: "100m"
  limits:
    memory: "640Mi"
    cpu: "500m"
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
- **Wave 4**: MinIO (document storage)

## Security

- Runs as non-root user (UID 1000)
- Read-only root filesystem
- Seccomp profile enabled
- Network policies for traffic control
- Secrets managed via sealed-secrets

## Troubleshooting

### Check pod logs

```bash
kubectl logs -n fineract -l app.kubernetes.io/name=asset-service
```

### Check health status

```bash
kubectl exec -n fineract deploy/asset-service -- curl -s http://localhost:8084/actuator/health
```

The startup probe allows up to 10 minutes for the app to finish resolving Fineract GL accounts and payment type references. If the pod still restarts after that, check the Fineract reference data and the service connection.

### Check database connectivity

```bash
kubectl exec -n fineract deploy/asset-service -- nc -zv postgres 5432
```

## License

Apache 2.0
