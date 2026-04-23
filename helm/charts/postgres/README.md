# PostgreSQL Helm Chart

A PostgreSQL Helm chart for the OM Platform. Supports standalone mode for local development and CloudNativePG for production HA.

## Features

- **Standalone Mode**: Single PostgreSQL instance for local development
- **CloudNativePG (CNPG)**: High Availability with automatic failover for production
- **Auto-generated Credentials**: Secure random passwords when not specified
- **Network Policies**: Optional network isolation
- **Persistence**: Configurable storage with PVC support
- **Health Checks**: Liveness, readiness, and startup probes
- **Additional Databases**: Create multiple databases and users
- **Synchronous Replication**: Zero data loss with CNPG synchronous mode

## Quick Start

### Local Development (Standalone)

```bash
# Build dependencies first
helm dependency build ./helm/charts/postgres

# Install the chart
helm install postgres ./helm/charts/postgres \
  -n development --create-namespace
```

### Production (CloudNativePG HA)

For production on-premises deployments requiring high availability:

#### Prerequisites

1. **Install CloudNativePG Operator** (required for CNPG mode):

```bash
# Install CNPG operator via Helm (recommended)
helm install cnpg cnpg/cloudnative-pg -n cnpg-system --create-namespace

# Verify operator is running
kubectl get pods -n cnpg-system
```

> **Why CNPG?** CloudNativePG is a Kubernetes-native PostgreSQL operator that provides:
> - High availability with automatic failover
> - Synchronous replication for zero data loss
> - Integrated backup/restore with S3 support
> - Rolling updates without downtime
> - Native Kubernetes integration

2. **Create Sealed Secret for Credentials** (using kubeseal):

```bash
# Create Kubernetes secret manifest
cat <<EOF > postgres-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
  namespace: production
type: Opaque
stringData:
  username: appuser
  password: <your-secure-password>
  postgres-password: <your-superuser-password>
EOF

# Seal the secret with kubeseal
kubeseal --format yaml < postgres-secret.yaml > postgres-sealed.yaml

# Apply the sealed secret
kubectl apply -f postgres-sealed.yaml

# Clean up unsealed secret (never commit this)
rm postgres-secret.yaml
```

#### Deploy PostgreSQL

```bash
# Install PostgreSQL with CNPG (3 instances for HA)
helm install postgres ./helm/charts/postgres \
  --set mode=cnpg \
  --set cnpg.instances=3 \
  --set auth.existingSecret=postgres-credentials \
  --set auth.database=appdb \
  --set auth.username=appuser \
  --set networkPolicy.ingressNamespaces[0]=your-app-namespace \
  -n production --create-namespace
```

> **Note**: For cloud deployments, consider using managed database services (AWS RDS, Google Cloud SQL, Azure Database) instead of self-hosted PostgreSQL.

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enabled` | Enable PostgreSQL deployment | `true` |
| `mode` | Deployment mode (`standalone` or `cnpg`) | `standalone` |

### Standalone Mode

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | PostgreSQL image repository | `postgres` |
| `image.tag` | PostgreSQL image tag | `17-alpine` |
| `auth.postgresPassword` | Postgres user password (auto-generated if empty) | `""` |
| `auth.database` | Default database name | `appdb` |
| `auth.username` | Application user name | `appuser` |
| `auth.existingSecret` | Use existing secret for credentials | `""` |
| `persistence.size` | Storage size | `5Gi` |

> **Security Note**: For production or any non-local environment, always use `auth.existingSecret` with a properly managed secret. Never commit passwords to git.

### CloudNativePG (CNPG) Mode

CloudNativePG provides production-grade PostgreSQL with high availability, automatic failover, and backup support.

> **Important**: CNPG requires specific PostgreSQL images from `ghcr.io/cloudnative-pg/postgresql`. Standard `postgres:17-alpine` images will NOT work because CNPG's initdb doesn't run the Docker entrypoint script. The chart defaults to `ghcr.io/cloudnative-pg/postgresql:17.2`.

> **UID/GID Note**: CNPG images use UID 26 (postgres user). Do NOT set `postgresUID` or `postgresGID` values in CNPG mode - leave them empty to use CNPG defaults.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `cnpg.instances` | Number of PostgreSQL instances (min 2 for HA) | `3` |
| `cnpg.imageName` | PostgreSQL image (CNPG-specific required) | `ghcr.io/cloudnative-pg/postgresql:17.2` |
| `cnpg.storage.resizeInUseVolumes` | Allow resizing PVCs | `true` |
| `cnpg.walStorage.enabled` | Enable separate WAL storage | `true` |
| `cnpg.walStorage.size` | WAL storage size | `1Gi` |

#### PostgreSQL Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `cnpg.postgresql.sharedBuffers` | Shared buffers | `256MB` |
| `cnpg.postgresql.maxConnections` | Max connections | `200` |
| `cnpg.postgresql.parameters` | Additional PostgreSQL parameters | `{}` |

#### Synchronous Replication

| Parameter | Description | Default |
|-----------|-------------|---------|
| `cnpg.postgresql.synchronous.method` | Synchronous method (`any` or `first`) | `any` |
| `cnpg.postgresql.synchronous.number` | Number of synchronous replicas | `1` |
| `cnpg.postgresql.synchronous.dataDurability` | Data durability policy | `required` |

#### Backup Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `cnpg.backup.enabled` | Enable Barman backup | `false` |
| `cnpg.backup.endpointURL` | S3 endpoint URL | `""` |
| `cnpg.backup.destinationPath` | S3 bucket path | `""` |
| `cnpg.backup.s3Credentials.secretName` | Secret with S3 credentials | `""` |
| `cnpg.backup.retentionPolicy` | Retention policy | `30d` |

#### Resource Allocation

Resources are configured at the global level for standalone mode. CNPG uses the same resources for all instances.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |

#### Pod Anti-Affinity

| Parameter | Description | Default |
|-----------|-------------|---------|
| `cnpg.affinity.enablePodAntiAffinity` | Enable pod anti-affinity | `true` |
| `cnpg.affinity.podAntiAffinityType` | Anti-affinity type (`preferred` or `required`) | `preferred` |
| `cnpg.affinity.topologyKey` | Topology key | `kubernetes.io/hostname` |

### CNPG Services

When running in CNPG mode, three services are created:

| Service | Purpose | Usage |
|---------|---------|-------|
| `postgres-rw` | Read-Write | Primary instance for writes |
| `postgres-ro` | Read-Only | Replicas for read queries |
| `postgres-r` | All Replicas | Any instance (read or write) |

Applications should use `postgres-rw` for write operations and `postgres-ro` for read operations.

### Additional Databases

Create additional databases and users:

```yaml
additionalDatabases:
  - name: analytics
    user: analytics_user
    password: ""  # Auto-generated
  - name: reporting
    user: reporting_user
    password: ""  # Auto-generated
```

### Init Scripts

Run initialization scripts on first start:

```yaml
initScripts:
  enabled: true
  scripts:
    01-schema.sql: |
      CREATE SCHEMA IF NOT EXISTS app;
      GRANT ALL ON SCHEMA app TO app_user;
```

### Persistence

| Parameter | Description | Default |
|-----------|-------------|---------|
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.storageClass` | Storage class | `""` |
| `persistence.accessModes` | Access modes | `["ReadWriteOnce"]` |
| `persistence.annotations` | PVC annotations | `{}` |

### Resources (Standalone)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |

### Network Policy

| Parameter | Description | Default |
|-----------|-------------|---------|
| `networkPolicy.enabled` | Enable network policies | `true` |
| `networkPolicy.ingressNamespaces` | Allowed ingress namespaces | `[]` |

### Monitoring

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoring.enabled` | Enable Prometheus monitoring | `false` |

## Accessing PostgreSQL

### Port Forward (Local)

```bash
kubectl port-forward svc/postgres 5432:5432 -n development
```

### Connect using psql

```bash
# Get the password
kubectl get secret postgres -n development -o jsonpath='{.data.postgres-password}' | base64 -d

# Connect using psql
PGPASSWORD=<password> psql -h localhost -U postgres -d appdb
```

### CNPG Connection

For CNPG mode, use the appropriate service:

```bash
# Read-Write (Primary)
PGPASSWORD=<password> psql -h postgres-rw.production.svc.cluster.local -U postgres -d appdb

# Read-Only (Replicas)
PGPASSWORD=<password> psql -h postgres-ro.production.svc.cluster.local -U postgres -d appdb
```

## Environment Variables

Applications can connect to PostgreSQL using these environment variables:

### Standalone Mode

```yaml
env:
  - name: DATABASE_HOST
    value: "postgres.development.svc.cluster.local"
  - name: DATABASE_PORT
    value: "5432"
  - name: DATABASE_USER
    valueFrom:
      secretKeyRef:
        name: postgres
        key: postgres-user
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres
        key: postgres-password
  - name: DATABASE_NAME
    value: "appdb"
```

### CNPG Mode

```yaml
env:
  - name: DATABASE_HOST
    value: "postgres-rw.production.svc.cluster.local"  # Use -rw for writes
  - name: DATABASE_HOST_RO
    value: "postgres-ro.production.svc.cluster.local"  # Use -ro for reads
  - name: DATABASE_PORT
    value: "5432"
  - name: DATABASE_USER
    valueFrom:
      secretKeyRef:
        name: postgres-app
        key: username
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-app
        key: password
  - name: DATABASE_NAME
    value: "appdb"
```

## Production Considerations

### High Availability (CNPG)

1. **Minimum 3 Instances**: Ensures quorum for failover
2. **Synchronous Replication**: Zero data loss with `synchronous.method: any`
3. **Pod Anti-Affinity**: Spread instances across nodes
4. **Separate WAL Storage**: Better I/O performance

### Backup Strategy

1. **Barman Integration**: Use CNPG's built-in Barman support
2. **S3 Storage**: Store backups in object storage
3. **Regular Testing**: Verify backup restoration regularly
4. **Point-in-Time Recovery**: Enable WAL archiving for PITR

### Security

1. **Use Existing Secrets**: Never hardcode credentials
2. **Network Policies**: Enable network isolation
3. **TLS**: Configure TLS for production deployments
4. **Limited Access**: Use dedicated users per application

### Performance

1. **Connection Pooling**: Use PgBouncer for connection pooling
2. **Resource Planning**: Allocate sufficient CPU and memory
3. **Storage Class**: Use fast storage (SSD) for production
4. **Shared Buffers**: Configure based on available memory

## Upgrading

```bash
helm upgrade postgres ./helm/charts/postgres \
  -f values-production.yaml \
  -n production
```

## Uninstalling

```bash
helm uninstall postgres -n development
```

> **Warning**: This will delete all data. Ensure you have backups.

## License

Apache 2.0
