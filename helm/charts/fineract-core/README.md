# Fineract Core Helm Chart

Helm chart for deploying Apache Fineract core banking engine on Kubernetes.

## Overview

This chart deploys the complete Fineract core banking infrastructure as part of Wave 4 deployment:

- **Fineract Read Instance** - Optimized for query operations
- **Fineract Write Instance** - Handles transaction operations
- **Fineract Batch Instance** - Processes scheduled jobs
- **NGINX Gateway** - Routes traffic to appropriate instances
- **OAuth2-Proxy** - Validates OIDC tokens from Keycloak
- **User Sync Service** - Synchronizes users between Keycloak and Fineract
- **Config CLI Job** - Bootstraps initial configuration

## Prerequisites

- Kubernetes 1.24+
- Helm 3.0+
- PostgreSQL (deployed in Wave 0)
- Redis (deployed in Wave 2)
- Keycloak (deployed in Wave 1)
- NGINX Ingress Controller
- cert-manager (for TLS certificates)

## Architecture

```
                    ┌─────────────────┐
                    │   NGINX         │
                    │   Ingress       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   NGINX         │
                    │   Gateway       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   OAuth2-Proxy  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
   │  Fineract   │   │  Fineract   │   │  Fineract   │
   │    Read     │   │    Write    │   │    Batch    │
   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
   │  PostgreSQL │   │    Redis    │   │   Keycloak  │
   │  (Wave 0)   │   │  (Wave 2)   │   │  (Wave 1)   │
   └─────────────┘   └─────────────┘   └─────────────┘
```

## Installation

### Quick Start

```bash
# Add required repositories (if using external charts)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Create namespace
kubectl create namespace fineract

# Install the chart
helm upgrade --install fineract-core ./helm/charts/fineract-core \
  -n fineract \
  -f values-prod.yaml
```

### With Custom Values

```bash
helm upgrade --install fineract-core ./helm/charts/fineract-core \
  -n fineract \
  --set global.domain=fineract.mycompany.com \
  --set database.host=postgres.database.svc.cluster.local \
  --set redis.host=redis.cache.svc.cluster.local \
  --set oauth2Proxy.keycloak.url=https://keycloak.mycompany.com
```

## Configuration

### Global Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.domain` | Base domain for the deployment | `example.com` |
| `global.environment` | Environment name (dev, staging, prod) | `production` |

### Fineract Instances

| Parameter | Description | Default |
|-----------|-------------|---------|
| `fineract.image.repository` | Fineract container image repository | `apache/fineract` |
| `fineract.image.tag` | Fineract container image tag | `1.8.0` |
| `fineract.read.enabled` | Enable read instance | `true` |
| `fineract.read.replicaCount` | Number of read replicas | `2` |
| `fineract.write.enabled` | Enable write instance | `true` |
| `fineract.write.replicaCount` | Number of write replicas | `2` |
| `fineract.batch.enabled` | Enable batch instance | `true` |
| `fineract.batch.replicaCount` | Number of batch replicas | `1` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `database.host` | PostgreSQL hostname | `postgresql-primary.database.svc.cluster.local` |
| `database.port` | PostgreSQL port | `5432` |
| `database.name` | Database name | `fineract` |
| `database.username` | Database username | `fineract` |
| `database.connectionPool.maxPoolSize` | Maximum connection pool size | `20` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.host` | Redis hostname | `redis-master.cache.svc.cluster.local` |
| `redis.port` | Redis port | `6379` |
| `redis.database` | Redis database number | `0` |

### Gateway Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `gateway.enabled` | Enable NGINX gateway | `true` |
| `gateway.ingress.hostname` | API gateway hostname | `api.fineract.example.com` |
| `gateway.ingress.tls.enabled` | Enable TLS | `true` |

### OAuth2 Proxy Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `oauth2Proxy.enabled` | Enable OAuth2 proxy | `true` |
| `oauth2Proxy.keycloak.url` | Keycloak URL | `https://keycloak.example.com` |
| `oauth2Proxy.keycloak.realm` | Keycloak realm | `fineract` |
| `oauth2Proxy.keycloak.clientId` | OIDC client ID | `fineract-api` |

### User Sync Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `userSync.enabled` | Enable user sync service | `true` |
| `userSync.syncIntervalSeconds` | Sync interval in seconds | `300` |

### Config CLI Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `configCli.enabled` | Enable config CLI job | `true` |
| `configCli.bootstrapData.tenants` | Initial tenant data | `[]` |
| `configCli.bootstrapData.users` | Initial user data | `[]` |

## Secrets Management

The chart supports multiple approaches for managing secrets:

### Option 1: Values File (Development Only)

```yaml
secrets:
  database:
    password: "your-db-password"
  keycloak:
    clientSecret: "your-client-secret"
  oauth2Proxy:
    cookieSecret: "your-cookie-secret"
  fineractApi:
    username: "admin"
    password: "your-api-password"
```

### Option 2: Sealed Secrets (Recommended for Production)

This chart uses SealedSecrets for secure secret management in GitOps workflows. The chart references SealedSecret resources that must be created before deployment.

#### Required SealedSecrets

| Secret Name | Keys | Used By |
|-------------|------|---------|
| `fineract-db-secret` | `password` | Fineract instances |
| `fineract-keycloak-sealed` | `clientId`, `clientSecret` | User Sync, OAuth2 Proxy |
| `fineract-oauth2-proxy-sealed` | `clientId`, `clientSecret`, `cookieSecret` | OAuth2 Proxy |
| `fineract-api-sealed` | `username`, `password` | User Sync, Config CLI |

#### Creating SealedSecrets

1. **Install kubeseal** (if not already installed):
```bash
# macOS
brew install kubeseal

# Linux
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-0.24.0-linux-amd64.tar.gz
tar -xzf kubeseal-0.24.0-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

2. **Create a database secret**:
```bash
kubectl create secret generic fineract-db-secret \
  --from-literal=password='your-secure-db-password' \
  --namespace fineract \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret-db.yaml
```

3. **Create Keycloak client secret**:
```bash
kubectl create secret generic fineract-keycloak-sealed \
  --from-literal=clientId='fineract-api' \
  --from-literal=clientSecret='your-keycloak-client-secret' \
  --namespace fineract \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret-keycloak.yaml
```

4. **Create OAuth2 Proxy secret**:
```bash
# Generate cookie secret
COOKIE_SECRET=$(openssl rand -base64 32 | tr -d '\n')

kubectl create secret generic fineract-oauth2-proxy-sealed \
  --from-literal=clientId='fineract-api' \
  --from-literal=clientSecret='your-oauth2-client-secret' \
  --from-literal=cookieSecret="$COOKIE_SECRET" \
  --namespace fineract \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret-oauth2.yaml
```

5. **Create Fineract API credentials secret**:
```bash
kubectl create secret generic fineract-api-sealed \
  --from-literal=username='admin' \
  --from-literal=password='your-fineract-api-password' \
  --namespace fineract \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret-api.yaml
```

6. **Apply SealedSecrets to cluster**:
```bash
kubectl apply -f sealed-secret-db.yaml
kubectl apply -f sealed-secret-keycloak.yaml
kubectl apply -f sealed-secret-oauth2.yaml
kubectl apply -f sealed-secret-api.yaml
```

7. **Commit SealedSecrets to Git** (safe to store in version control):
```bash
git add sealed-secret-*.yaml
git commit -m "Add sealed secrets for fineract-core"
git push
```

### Option 3: External Secrets Operator (Alternative for Production)

```yaml
serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/fineract-role

# Create ExternalSecret resources separately
```

### Verifying Secrets

```bash
# List secrets in namespace
kubectl get secrets -n fineract

# Verify sealed secrets are unsealed
kubectl get sealedsecrets -n fineract

# Check secret contents (base64 decoded)
kubectl get secret fineract-db-secret -n fineract -o jsonpath='{.data.password}' | base64 -d
```

## Resource Requirements

### Minimum Requirements (Development)

| Component | CPU Request | Memory Request | CPU Limit | Memory Limit |
|-----------|-------------|----------------|-----------|--------------|
| Fineract Read | 500m | 1Gi | 2 | 2Gi |
| Fineract Write | 1 | 2Gi | 4 | 4Gi |
| Fineract Batch | 500m | 1Gi | 2 | 2Gi |
| Gateway | 100m | 128Mi | 500m | 512Mi |
| OAuth2 Proxy | 100m | 128Mi | 500m | 512Mi |
| User Sync | 100m | 128Mi | 500m | 512Mi |

### Recommended Requirements (Production)

Adjust replica counts and enable autoscaling based on your workload:

```yaml
fineract:
  read:
    replicaCount: 3
    autoscaling:
      enabled: true
      maxReplicas: 10
  write:
    replicaCount: 3
    autoscaling:
      enabled: true
      maxReplicas: 5
```

## Health Checks

All components include health checks:

- **Fineract instances**: `/fineract-provider/actuator/health`
- **User Sync**: `/health` and `/ready`
- **Gateway**: HTTP GET on port 8080
- **OAuth2 Proxy**: HTTP GET on port 4180

## Troubleshooting

### Pod Not Starting

1. Check pod status: `kubectl get pods -n fineract`
2. Describe pod: `kubectl describe pod <pod-name> -n fineract`
3. Check logs: `kubectl logs <pod-name> -n fineract`
4. Verify secrets exist: `kubectl get secrets -n fineract`

### Database Connection Issues

1. Verify PostgreSQL is running: `kubectl get pods -n database`
2. Check connectivity: `kubectl run pg-test --rm -it --image=postgres -- psql -h <host> -U <user>`
3. Verify credentials in secret

### Authentication Failures

1. Verify Keycloak is accessible
2. Check OAuth2 Proxy logs
3. Verify client secret is correct
4. Check redirect URL configuration

### Gateway Routing Issues

1. Check gateway ConfigMap: `kubectl get configmap -n fineract`
2. Verify backend services are healthy
3. Check nginx logs: `kubectl logs <gateway-pod> -n fineract`

## Upgrading

```bash
# Check for changes
helm diff upgrade fineract-core ./helm/charts/fineract-core -n fineract -f values-prod.yaml

# Apply upgrade
helm upgrade fineract-core ./helm/charts/fineract-core -n fineract -f values-prod.yaml
```

## Uninstallation

```bash
helm uninstall fineract-core -n fineract
```

Note: This will not remove persistent data in PostgreSQL or Redis.

## Related Charts

- **fineract-ui-stack** (Wave 7): UI applications for Fineract
- **base-app**: Base chart pattern used by this chart

## Contributing

See the main repository README for contribution guidelines.

## License

Apache License 2.0
