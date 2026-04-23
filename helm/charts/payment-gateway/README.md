# Payment Gateway Helm Chart

A Helm chart for deploying the Payment Gateway Service on Kubernetes.

## Overview

The Payment Gateway Service handles payment processing for the Fineract platform with support for multiple mobile money providers:

- **MTN Mobile Money (MoMo)** - Collection and Disbursement
- **Orange Money** - Payment processing
- **CinetPay** - Payment gateway integration
- **Nokash** - Payment processing

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
helm install payment-gateway ./helm/charts/payment-gateway \
  --namespace fineract \
  --create-namespace \
  -f values.yaml
```

### Using with sealed-secrets

1. Create the sealed-secret for credentials:

```bash
kubectl create secret generic payment-gateway-credentials \
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
helm install payment-gateway ./helm/charts/payment-gateway \
  --namespace fineract \
  --set existingSecret=payment-gateway-credentials
```

## Configuration

### Key Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.registry` | Image registry | `ghcr.io` |
| `image.repository` | Image repository | `adorsys-gis/fineract-apps/payment-gateway-service` |
| `image.tag` | Image tag | `latest` |
| `service.port` | Service port | `8082` |
| `management.port` | Management/Actuator port | `8084` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.database.host` | PostgreSQL host | `postgres` |
| `config.database.port` | PostgreSQL port | `5432` |
| `config.database.url` | JDBC URL | `jdbc:postgresql://postgres:5432/payment_gateway` |
| `config.database.username` | Database username | `payment_gateway` |
| `config.database.password` | Database password (use sealed-secret) | `""` |

### Keycloak Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.keycloak.url` | Keycloak URL | `http://keycloak:8080` |
| `config.keycloak.realm` | Keycloak realm | `master` |
| `config.keycloak.clientId` | OAuth2 client ID | `payment-gateway` |
| `config.keycloak.clientSecret` | OAuth2 client secret (use sealed-secret) | `""` |

### Payment Provider Configuration

#### MTN MoMo

```yaml
providers:
  mtn:
    enabled: true
    baseUrl: "https://momodeveloper.mtn.com"
    targetEnv: "mtn-cameroon"
    apiUserId: "<user-id>"
    # Secrets via sealed-secret:
    # apiKey, collectionKey, disbursementKey
```

#### Orange Money

```yaml
providers:
  orange:
    enabled: true
    baseUrl: "https://api.orange.com"
    clientId: "<client-id>"
    # Secrets via sealed-secret:
    # clientSecret
```

#### CinetPay

```yaml
providers:
  cinetpay:
    enabled: true
    baseUrl: "https://api.cinetpay.com"
    siteId: "<site-id>"
    # Secrets via sealed-secret:
    # apiKey, apiPassword
```

#### Nokash

```yaml
providers:
  nokash:
    enabled: true
    baseUrl: "<nokash-url>"
    # Secrets via sealed-secret:
    # iSpaceKey, appSpaceKey
```

### Resource Configuration

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
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

### Network Policy

```yaml
networkPolicy:
  enabled: true
  ingressNamespace: "ingress-nginx"
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
kubectl logs -n fineract -l app.kubernetes.io/name=payment-gateway
```

### Check health status

```bash
kubectl exec -n fineract deploy/payment-gateway -- curl -s http://localhost:8084/actuator/health
```

### Check database connectivity

```bash
kubectl exec -n fineract deploy/payment-gateway -- nc -zv postgres 5432
```

## License

Apache 2.0
