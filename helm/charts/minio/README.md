# MinIO Helm Chart

A MinIO Helm chart for the OM Platform. S3-compatible object storage for local development and testing.

## Features

- **Standalone Mode**: Single MinIO instance for local development
- **External Mode**: Reference external S3 services (AWS S3, etc.) - no resources deployed
- **Auto-generated Credentials**: Secure random passwords when not specified
- **Bucket Initialization**: Automatic bucket creation on startup
- **Network Policies**: Optional network isolation
- **Persistence**: Configurable storage with PVC support
- **Health Checks**: Liveness, readiness, and startup probes
- **Console**: Built-in MinIO Console for management

## Quick Start

### Local Development (Standalone)

```bash
# Build dependencies first
helm dependency build ./helm/charts/minio

# Install the chart
helm install minio ./helm/charts/minio \
  -f values-local.yaml \
  -n development --create-namespace
```

### With Custom Buckets

```bash
helm install minio ./helm/charts/minio \
  --set buckets[0].name=documents \
  --set buckets[0].policy=none \
  --set buckets[1].name=backups \
  -n development
```

### Production (External S3)

For production, you typically use a managed S3 service (AWS S3, GCS, etc.). In this case, **do not install this chart**. Instead:

1. Create a secret with your S3 credentials using a secure method:
   
   **Option A: External Secrets Operator (Recommended)**
   ```yaml
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
   # Create a temporary secret
   kubectl create secret generic s3-credentials \
     --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
     --from-literal=secret-access-key=$(openssl rand -base64 32) \
     -n production --dry-run=client -o yaml > secret.yaml
   
   # Seal it
   kubeseal --format yaml < secret.yaml > sealed-secret.yaml
   
   # Apply the sealed secret
   kubectl apply -f sealed-secret.yaml
   ```

   **Option C: kubectl create (for manual setup)**
   ```bash
   kubectl create secret generic s3-credentials \
     --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
     --from-literal=secret-access-key=$(openssl rand -base64 32) \
     -n production
   ```

2. Configure your application to use S3 directly:
   ```yaml
   env:
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
     - name: S3_BUCKET
       value: "my-production-bucket"
   ```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enabled` | Enable MinIO deployment | `true` |
| `mode` | Deployment mode (`standalone` or `external`) | `standalone` |

> **Note**: When `enabled: false` or `mode: external`, no Kubernetes resources are created. This is intentional - use external managed S3 services instead.

### Standalone Mode

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | MinIO image repository | `minio/minio` |
| `image.tag` | MinIO image tag | `RELEASE.2025-01-01T00-00-00Z` |
| `auth.rootUser` | Root user (admin) | `minioadmin` |
| `auth.rootPassword` | Root password (auto-generated if empty) | `""` |
| `auth.existingSecret` | Use existing secret for credentials | `""` |

> **Security Note**: For production or any non-local environment, always use `auth.existingSecret` with a properly managed secret. Never commit passwords to git.

### Init Container

| Parameter | Description | Default |
|-----------|-------------|---------|
| `initContainer.image.repository` | Init container image | `busybox` |
| `initContainer.image.tag` | Init container tag | `1.36` |
| `initContainer.resources.requests.memory` | Memory request | `16Mi` |
| `initContainer.resources.requests.cpu` | CPU request | `10m` |

### External Mode (Reference Only)

When using external S3, these values are for reference purposes only:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `external.endpoint` | S3 endpoint | `""` |
| `external.region` | S3 region | `""` |
| `external.ssl` | Use SSL | `true` |
| `external.existingSecret` | Secret containing credentials | `""` |

### Buckets

| Parameter | Description | Default |
|-----------|-------------|---------|
| `buckets[].name` | Bucket name | - |
| `buckets[].policy` | Bucket policy (`none`, `download`, `upload`, `public`) | `none` |
| `buckets[].quota` | Bucket quota (e.g., `10GB`) | `""` |

### Persistence

| Parameter | Description | Default |
|-----------|-------------|---------|
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.size` | Storage size | `10Gi` |
| `persistence.storageClass` | Storage class | `""` |

### Resources

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.requests.memory` | Memory request | `128Mi` |
| `resources.requests.cpu` | CPU request | `50m` |
| `resources.limits.memory` | Memory limit | `256Mi` |
| `resources.limits.cpu` | CPU limit | `250m` |

### Console

| Parameter | Description | Default |
|-----------|-------------|---------|
| `console.enabled` | Enable MinIO Console | `true` |
| `console.ingress.enabled` | Enable ingress for console | `false` |
| `console.ingress.host` | Console hostname | `""` |

### Network Policy

| Parameter | Description | Default |
|-----------|-------------|---------|
| `networkPolicy.enabled` | Enable network policy | `true` |
| `networkPolicy.ingressNamespaces` | Namespaces allowed to connect | `[]` |

### Monitoring

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoring.enabled` | Enable Prometheus pod annotations | `false` |
| `monitoring.prometheusPort` | Prometheus scrape port | `9000` |
| `monitoring.serviceMonitor.enabled` | Create ServiceMonitor resource | `false` |

## Bucket Initialization

Create buckets automatically on startup:

```yaml
buckets:
  - name: documents
    policy: none
  - name: backups
    policy: none
  - name: uploads
    policy: public
    quota: 10GB
```

## Connecting to MinIO

### From within the cluster

```bash
# Get the credentials
export MINIO_ROOT_USER=$(kubectl get secret minio -n <namespace> -o jsonpath="{.data.root-user}" | base64 -d)
export MINIO_ROOT_PASSWORD=$(kubectl get secret minio -n <namespace> -o jsonpath="{.data.root-password}" | base64 -d)

# Use mc client
kubectl run mc-client --rm -it --image=minio/mc:RELEASE.2025-01-01T00-00-00Z -- \
  mc alias set myminio http://minio.<namespace>.svc.cluster.local:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
```

### Port forward for local access

```bash
# API port
kubectl port-forward svc/minio 9000:9000 -n <namespace>

# Console port
kubectl port-forward svc/minio 9001:9001 -n <namespace>
```

### Access Console

```bash
# Port forward
kubectl port-forward svc/minio 9001:9001 -n <namespace>

# Open browser
open http://localhost:9001
```

## Using with Applications

### Environment Variables

```yaml
env:
  - name: S3_ENDPOINT
    value: "http://minio.<namespace>.svc.cluster.local:9000"
  - name: S3_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: minio
        key: root-user
  - name: S3_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: minio
        key: root-password
  - name: S3_BUCKET
    value: "documents"
```

### AWS SDK Example (Python)

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://minio.development.svc.cluster.local:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='<password>',
)

# List buckets
buckets = s3.list_buckets()
```

## Production Considerations

For production workloads:

1. **Use Managed S3 Services**: AWS S3, Google Cloud Storage, or Azure Blob Storage
2. **For Self-hosted Production**: Use MinIO in distributed mode with at least 4 nodes
3. **Secrets Management**: Use External Secrets Operator or Sealed Secrets - never commit credentials
4. **Backup**: Configure versioning and lifecycle policies
5. **Resource Sizing**: Increase resources based on workload

## Upgrading

```bash
helm upgrade minio ./helm/charts/minio -n <namespace>
```

## Uninstalling

```bash
helm uninstall minio -n <namespace>
```

> **Note**: PVCs are not deleted by default. To delete them:
> ```bash
> kubectl delete pvc -l app.kubernetes.io/name=minio -n <namespace>
> ```

## License

Apache-2.0
