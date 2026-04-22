# PostgreSQL Helm Chart

A PostgreSQL Helm chart for the OM Platform. Supports standalone mode for local development and external mode for cloud databases (RDS, Cloud SQL, etc.).

## Features

- **Standalone Mode**: Single PostgreSQL instance for local development
- **External Mode**: Reference external databases (RDS, Cloud SQL, etc.) - no resources deployed
- **Auto-generated Credentials**: Secure random passwords when not specified
- **Network Policies**: Optional network isolation
- **Persistence**: Configurable storage with PVC support
- **Health Checks**: Liveness, readiness, and startup probes
- **Additional Databases**: Create multiple databases and users

## Quick Start

### Local Development (Standalone)

```bash
# Build dependencies first
helm dependency build ./helm/charts/postgres

# Install the chart
helm install postgres ./helm/charts/postgres \
  -f values-local.yaml \
  -n development --create-namespace
```

### Production (External Database)

For production, you typically use a managed database service (RDS, Cloud SQL). In this case, **do not install this chart**. Instead:

1. Create a secret with your external database credentials using a secure method:
   
   **Option A: External Secrets Operator (Recommended)**
   ```yaml
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
   ```

   **Option B: Sealed Secrets**
   ```bash
   # Create a temporary secret
   kubectl create secret generic rds-credentials \
     --from-literal=username=appuser \
     --from-literal=password=$(openssl rand -base64 32) \
     -n production --dry-run=client -o yaml > secret.yaml
   
   # Seal it
   kubeseal --format yaml < secret.yaml > sealed-secret.yaml
   
   # Apply the sealed secret
   kubectl apply -f sealed-secret.yaml
   ```

   **Option C: kubectl create (for manual setup)**
   ```bash
   kubectl create secret generic rds-credentials \
     --from-literal=username=appuser \
     --from-literal=password=$(openssl rand -base64 32) \
     -n production
   ```

2. Configure your application to use the external database directly:
   ```yaml
   env:
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
   ```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enabled` | Enable PostgreSQL deployment | `true` |
| `mode` | Deployment mode (`standalone` or `external`) | `standalone` |

> **Note**: When `enabled: false` or `mode: external`, no Kubernetes resources are created. This is intentional - use external managed services instead.

### Standalone Mode

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | PostgreSQL image repository | `postgres` |
| `image.tag` | PostgreSQL image tag | `17-alpine` |
| `auth.database` | Database name | `appdb` |
| `auth.username` | Application username | `appuser` |
| `auth.password` | Application password (auto-generated if empty) | `""` |
| `auth.postgresPassword` | Superuser password (auto-generated if empty) | `""` |
| `auth.existingSecret` | Use existing secret for credentials | `""` |

> **Security Note**: For production or any non-local environment, always use `auth.existingSecret` with a properly managed secret. Never commit passwords to git.

### External Mode (Reference Only)

When using an external database, these values are for reference/connection purposes only:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `external.host` | External database host | `""` |
| `external.port` | External database port | `5432` |
| `external.database` | External database name | `""` |
| `external.existingSecret` | Secret containing credentials | `""` |

### Persistence

| Parameter | Description | Default |
|-----------|-------------|---------|
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.size` | Storage size | `5Gi` |
| `persistence.storageClass` | Storage class | `""` |

### Resources

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |

### Network Policy

| Parameter | Description | Default |
|-----------|-------------|---------|
| `networkPolicy.enabled` | Enable network policy | `true` |
| `networkPolicy.ingressNamespaces` | Namespaces allowed to connect | `[]` |

### Monitoring

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoring.enabled` | Enable Prometheus pod annotations | `false` |
| `monitoring.prometheusPort` | Prometheus exporter port | `9187` |
| `monitoring.serviceMonitor.enabled` | Create ServiceMonitor resource | `false` |

## Additional Databases

Create additional databases and users:

```yaml
additionalDatabases:
  - name: keycloak
    user: keycloak
    password: ""  # Auto-generated
  - name: tenants
    user: tenant_admin
    password: ""  # Auto-generated
```

## Init Scripts

Run custom SQL scripts on first start:

```yaml
initScripts:
  01-init.sql: |
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## Connecting to PostgreSQL

### From within the cluster

```bash
# Get the password
export PGPASSWORD=$(kubectl get secret postgres -n <namespace> -o jsonpath="{.data.password}" | base64 -d)

# Connect using psql
kubectl run psql-client --rm -it --image=postgres:17-alpine -- \
  psql -h postgres.<namespace>.svc.cluster.local -U appuser -d appdb
```

### Port forward for local access

```bash
kubectl port-forward svc/postgres 5432:5432 -n <namespace>
psql -h localhost -U appuser -d appdb
```

## Production Considerations

For production workloads:

1. **Use Managed Database Services**: RDS, Cloud SQL, or Azure Database for PostgreSQL
2. **HA Configuration**: For self-hosted HA, use `bitnami/postgresql-ha` or CloudNativePG
3. **Secrets Management**: Use External Secrets Operator or Sealed Secrets - never commit passwords
4. **Backup**: Configure automated backups to S3/MinIO
5. **Resource Sizing**: Increase resources based on workload

## Upgrading

```bash
helm upgrade postgres ./helm/charts/postgres -n <namespace>
```

## Uninstalling

```bash
helm uninstall postgres -n <namespace>
```

> **Note**: PVCs are not deleted by default. To delete them:
> ```bash
> kubectl delete pvc -l app.kubernetes.io/name=postgres -n <namespace>
> ```

## License

Apache-2.0
