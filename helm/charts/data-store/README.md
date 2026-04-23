# Data Store Helm Chart

An umbrella chart for the foundational data persistence layer. Deploys PostgreSQL + MinIO for local development environments.

## Overview

This chart deploys:
- **PostgreSQL** - Relational database for application data
- **MinIO** - S3-compatible object storage for files and backups

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     data-store chart                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │   PostgreSQL    │         │     MinIO       │            │
│  │   (postgres)    │         │    (minio)      │            │
│  │                 │         │                 │            │
│  │  • StatefulSet  │         │  • StatefulSet  │            │
│  │  • PVC          │         │  • PVC          │            │
│  │  • Secret       │         │  • Secret       │            │
│  │  • Service      │         │  • Service      │            │
│  │  • NetworkPolicy│         │  • NetworkPolicy│            │
│  │                 │         │  • Init Job     │            │
│  └─────────────────┘         └─────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Local Development

```bash
# Build dependencies first
helm dependency build ./helm/charts/data-store

# Install with local values
helm install data-store ./helm/charts/data-store \
  -f values-local.yaml \
  -n development --create-namespace
```

### Production (External Services)

For production, you typically use managed services (RDS, S3). In this case, **do not install this chart**. Instead:

1. Create secrets for your external services using a secure method:
   
   **Option A: External Secrets Operator (Recommended)**
   ```yaml
   # RDS credentials
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: rds-credentials
     namespace: production
   spec:
     refreshInterval: 1h
     secretStoreRef:
       name: aws-secretsmanager
       kind: SecretStore
     target:
       name: rds-credentials
     data:
       - secretKey: username
         remoteRef:
           key: prod/database/credentials
           property: username
       - secretKey: password
         remoteRef:
           key: prod/database/credentials
           property: password
   ---
   # S3 credentials
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: s3-credentials
     namespace: production
   spec:
     refreshInterval: 1h
     secretStoreRef:
       name: aws-secretsmanager
       kind: SecretStore
     target:
       name: s3-credentials
     data:
       - secretKey: access-key-id
         remoteRef:
           key: prod/s3/credentials
           property: access_key_id
       - secretKey: secret-access-key
         remoteRef:
           key: prod/s3/credentials
           property: secret_access_key
   ```

   **Option B: Sealed Secrets**
   ```bash
   # RDS credentials
   kubectl create secret generic rds-credentials \
     --from-literal=username=appuser \
     --from-literal=password=$(openssl rand -base64 32) \
     -n production --dry-run=client -o yaml | kubeseal --format yaml > rds-sealed.yaml
   
   # S3 credentials
   kubectl create secret generic s3-credentials \
     --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
     --from-literal=secret-access-key=$(openssl rand -base64 32) \
     -n production --dry-run=client -o yaml | kubeseal --format yaml > s3-sealed.yaml
   
   kubectl apply -f rds-sealed.yaml -f s3-sealed.yaml
   ```

2. Configure your application to use external services directly:
   ```yaml
   env:
     # PostgreSQL (RDS)
     - name: DATABASE_HOST
       value: "mydb.xxxxx.region.rds.amazonaws.com"
     - name: DATABASE_PORT
       value: "5432"
     - name: DATABASE_USER
       valueFrom:
         secretKeyRef:
           name: rds-credentials
           key: username
     - name: DATABASE_PASSWORD
       valueFrom:
         secretKeyRef:
           name: rds-credentials
           key: password

     # S3
     - name: S3_ENDPOINT
       value: "https://s3.amazonaws.com"
     - name: S3_REGION
       value: "us-east-1"
     - name: S3_ACCESS_KEY_ID
       valueFrom:
         secretKeyRef:
           name: s3-credentials
           key: access-key-id
     - name: S3_SECRET_ACCESS_KEY
       valueFrom:
         secretKeyRef:
           name: s3-credentials
           key: secret-access-key
   ```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgres.enabled` | Enable PostgreSQL deployment | `true` |
| `postgres.mode` | PostgreSQL mode (`standalone` or `cnpg`) | `standalone` |
| `minio.enabled` | Enable MinIO deployment | `true` |
| `minio.mode` | MinIO mode (`standalone` or `distributed`) | `standalone` |

> **Note**: Use `cnpg` mode for PostgreSQL HA and `distributed` mode for MinIO HA in production.

> **Documentation**: For detailed configuration options, see the individual chart documentation:
> - **PostgreSQL**: [../postgres/README.md](../postgres/README.md) - CNPG mode, synchronous replication, backups
> - **MinIO**: [../minio/README.md](../minio/README.md) - Distributed mode, erasure coding, bucket initialization

### PostgreSQL Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgres.auth.database` | Database name | `appdb` |
| `postgres.auth.username` | Application username | `appuser` |
| `postgres.auth.password` | Application password (auto-generated if empty) | `""` |
| `postgres.auth.existingSecret` | Use existing secret | `""` |
| `postgres.persistence.size` | Storage size | `5Gi` |
| `postgres.resources.requests.memory` | Memory request | `256Mi` |
| `postgres.resources.requests.cpu` | CPU request | `100m` |

> **Security Note**: For production or any non-local environment, always use `postgres.auth.existingSecret` with a properly managed secret. Never commit passwords to git.

### MinIO Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `minio.auth.rootUser` | Root user | `minioadmin` |
| `minio.auth.rootPassword` | Root password (auto-generated if empty) | `""` |
| `minio.auth.existingSecret` | Use existing secret | `""` |
| `minio.buckets` | Buckets to create | `documents, backups` |
| `minio.persistence.size` | Storage size | `10Gi` |
| `minio.resources.requests.memory` | Memory request | `128Mi` |
| `minio.resources.requests.cpu` | CPU request | `50m` |

> **Security Note**: For production or any non-local environment, always use `minio.auth.existingSecret` with a properly managed secret. Never commit credentials to git.

## Deployment Modes

### Local Development (Default)

Both PostgreSQL and MinIO are deployed internally:

```yaml
postgres:
  enabled: true
  mode: standalone

minio:
  enabled: true
  mode: standalone
```

### Production HA (On-Premises)

For production with high availability, use CNPG and distributed MinIO:

```yaml
postgres:
  enabled: true
  mode: cnpg
  cnpg:
    instances: 3
    affinity:
      enablePodAntiAffinity: true

minio:
  enabled: true
  mode: distributed
  distributed:
    replicas: 4
    podAntiAffinity:
      enabled: true
```

#### Prerequisites for HA Mode

1. **CloudNativePG Operator** (required for PostgreSQL HA):
   ```bash
   helm install cnpg cnpg/cloudnative-pg -n cnpg-system --create-namespace
   ```

2. **Sealed Secrets** (for GitOps-compatible secrets):
   ```bash
   # Install sealed-secrets controller
   helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system
   
   # Create sealed secrets for credentials
   # See configs/secrets-templates/ for examples
   ```

3. **Storage Class** with volume expansion support (for PVC resizing)

> **Important Notes**:
> - CNPG requires specific PostgreSQL images from `ghcr.io/cloudnative-pg/postgresql` (not standard `postgres` images)
> - CNPG images use UID 26 - do not set `postgresUID`/`postgresGID` in CNPG mode
> - MinIO distributed mode requires network policies to allow inter-pod communication (automatically configured)
> - Minimum 2 nodes required for HA (3+ recommended for production)

### Mixed Mode Examples

#### Internal PostgreSQL with External S3

Deploy only PostgreSQL, use external S3:

```yaml
postgres:
  enabled: true
  mode: standalone

minio:
  enabled: false  # Don't deploy MinIO
```

Then configure your application to use external S3 directly with proper secrets management.

#### External RDS with Internal MinIO

Deploy only MinIO, use external RDS:

```yaml
postgres:
  enabled: false  # Don't deploy PostgreSQL

minio:
  enabled: true
  mode: standalone
```

Then configure your application to use external RDS directly with proper secrets management.

## Connecting to Services

### PostgreSQL

```bash
# Get password
export PGPASSWORD=$(kubectl get secret data-store-postgres -n <namespace> -o jsonpath="{.data.password}" | base64 -d)

# Connect
kubectl run psql --rm -it --image=postgres:17-alpine -- \
  psql -h data-store-postgres.<namespace>.svc.cluster.local -U appuser -d appdb
```

### MinIO

```bash
# Get credentials
export MINIO_ROOT_USER=$(kubectl get secret data-store-minio -n <namespace> -o jsonpath="{.data.root-user}" | base64 -d)
export MINIO_ROOT_PASSWORD=$(kubectl get secret data-store-minio -n <namespace> -o jsonpath="{.data.root-password}" | base64 -d)

# Use mc client
kubectl run mc --rm -it --image=minio/mc -- \
  mc alias set myminio http://data-store-minio.<namespace>.svc.cluster.local:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
```

## Application Integration

### Environment Variables

```yaml
env:
  # PostgreSQL
  - name: DATABASE_HOST
    value: "data-store-postgres.development.svc.cluster.local"
  - name: DATABASE_PORT
    value: "5432"
  - name: DATABASE_NAME
    value: "appdb"
  - name: DATABASE_USER
    valueFrom:
      secretKeyRef:
        name: data-store-postgres
        key: username
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: data-store-postgres
        key: password

  # MinIO/S3
  - name: S3_ENDPOINT
    value: "http://data-store-minio.development.svc.cluster.local:9000"
  - name: S3_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: data-store-minio
        key: root-user
  - name: S3_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: data-store-minio
        key: root-password
  - name: S3_BUCKET
    value: "documents"
```

## Upgrading

```bash
helm dependency update ./helm/charts/data-store
helm upgrade data-store ./helm/charts/data-store -n <namespace>
```

## Uninstalling

```bash
helm uninstall data-store -n <namespace>
```

> **Note**: PVCs are not deleted by default. To delete them:
> ```bash
> kubectl delete pvc -l app.kubernetes.io/name=postgres -n <namespace>
> kubectl delete pvc -l app.kubernetes.io/name=minio -n <namespace>
> ```

## License

Apache-2.0
