# MinIO Helm Chart

A MinIO Helm chart for the OM Platform. S3-compatible object storage for local development and production HA.

## Features

- **Standalone Mode**: Single MinIO instance for local development
- **Distributed Mode**: High Availability with erasure coding for production
- **Auto-generated Credentials**: Secure random passwords when not specified
- **Bucket Initialization**: Automatic bucket creation on startup
- **Network Policies**: Optional network isolation
- **Persistence**: Configurable storage with PVC support
- **Health Checks**: Liveness, readiness, and startup probes
- **Console**: Built-in MinIO Console for management
- **Pod Anti-Affinity**: Spread replicas across nodes in distributed mode

## Quick Start

### Local Development (Standalone)

```bash
# Build dependencies first
helm dependency build ./helm/charts/minio

# Install the chart
helm install minio ./helm/charts/minio \
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

### Production (Distributed HA)

For production on-premises deployments requiring high availability:

#### Prerequisites

1. **Create Sealed Secret for Credentials** (using kubeseal):

```bash
# Create Kubernetes secret manifest
cat <<EOF > minio-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: minio-credentials
  namespace: production
type: Opaque
stringData:
  root-user: minioadmin
  root-password: <your-secure-password>
EOF

# Seal the secret with kubeseal
kubeseal --format yaml < minio-secret.yaml > minio-sealed.yaml

# Apply the sealed secret
kubectl apply -f minio-sealed.yaml

# Clean up unsealed secret (never commit this)
rm minio-secret.yaml
```

#### Deploy MinIO

```bash
helm install minio ./helm/charts/minio \
  --set mode=distributed \
  --set distributed.replicas=4 \
  --set distributed.podAntiAffinity.enabled=true \
  --set auth.existingSecret=minio-credentials \
  --set networkPolicy.ingressNamespaces[0]=your-app-namespace \
  -n production --create-namespace
```

> **Note**: For cloud deployments, consider using managed S3 services (AWS S3, GCS, etc.) instead of self-hosted MinIO.

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enabled` | Enable MinIO deployment | `true` |
| `mode` | Deployment mode (`standalone` or `distributed`) | `standalone` |

### Standalone Mode

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | MinIO image repository | `minio/minio` |
| `image.tag` | MinIO image tag | `RELEASE.2025-09-07T16-13-09Z-cpuv1` |
| `auth.rootUser` | Root user (admin) | `minioadmin` |
| `auth.rootPassword` | Root password (auto-generated if empty) | `""` |
| `auth.existingSecret` | Use existing secret for credentials | `""` |
| `persistence.size` | Storage size | `4Gi` |

> **Security Note**: For production or any non-local environment, always use `auth.existingSecret` with a properly managed secret. Never commit passwords to git.

### Distributed Mode (HA)

Distributed mode provides high availability through erasure coding and data replication across multiple nodes.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `distributed.replicas` | Number of MinIO nodes (4, 6, 8, 12, 16 recommended) | `4` |
| `distributed.drivesPerNode` | Drives per node (1-8) | `1` |
| `distributed.storage.size` | Storage size per replica | `10Gi` |
| `distributed.storage.storageClass` | Storage class for PVCs | `""` |
| `distributed.podAntiAffinity.enabled` | Enable pod anti-affinity | `true` |
| `distributed.podAntiAffinity.type` | Anti-affinity type (`preferred` or `required`) | `preferred` |
| `distributed.podAntiAffinity.topologyKey` | Topology key for anti-affinity | `kubernetes.io/hostname` |
| `distributed.podAntiAffinity.weight` | Weight for preferred anti-affinity | `100` |
| `distributed.resources.requests.memory` | Memory request per pod | `512Mi` |
| `distributed.resources.requests.cpu` | CPU request per pod | `100m` |
| `distributed.resources.limits.memory` | Memory limit per pod | `1Gi` |
| `distributed.resources.limits.cpu` | CPU limit per pod | `500m` |

#### Erasure Coding

MinIO distributed mode uses erasure coding for data protection:

| Replicas | Erasure Set | Protection Level |
|----------|-------------|------------------|
| 4 | EC:2 | Can lose 2 drives/nodes |
| 6 | EC:2 | Can lose 2 drives/nodes |
| 8 | EC:4 | Can lose 4 drives/nodes |
| 12 | EC:4 | Can lose 4 drives/nodes |
| 16 | EC:8 | Can lose 8 drives/nodes |

#### Pod Anti-Affinity

For true HA, enable pod anti-affinity to spread MinIO pods across different nodes:

```yaml
distributed:
  podAntiAffinity:
    enabled: true
    type: required  # Use 'preferred' for softer constraint
    topologyKey: kubernetes.io/hostname
```

#### Network Policy for Distributed Mode

When network policies are enabled (`networkPolicy.enabled: true`), the chart automatically configures egress rules to allow inter-pod communication required for distributed mode. This is essential for erasure coding and data replication between MinIO nodes.

> **Note**: The network policy template automatically adds egress rules for pod-to-pod communication on ports 9000 and 9001 when running in distributed mode.

### Init Container

| Parameter | Description | Default |
|-----------|-------------|---------|
| `initContainer.enabled` | Enable init container for permissions | `false` |
| `initContainer.image.repository` | Init container image | `busybox` |
| `initContainer.image.tag` | Init container tag | `1.36` |
| `initContainer.resources.requests.memory` | Memory request | `16Mi` |
| `initContainer.resources.requests.cpu` | CPU request | `10m` |

> **Note**: Disable init container for Longhorn and other storage classes that don't support chown.

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
| `persistence.storageClass` | Storage class | `""` |
| `persistence.accessModes` | Access modes | `["ReadWriteOnce"]` |
| `persistence.size` | Storage size | `4Gi` |
| `persistence.annotations` | PVC annotations | `{}` |

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
| `console.ingress.enabled` | Enable Ingress for Console | `false` |
| `console.ingress.hosts` | Ingress hosts | `[]` |

### Network Policy

| Parameter | Description | Default |
|-----------|-------------|---------|
| `networkPolicy.enabled` | Enable network policies | `true` |
| `networkPolicy.ingressNamespaces` | Allowed ingress namespaces | `[]` |

### Monitoring

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoring.enabled` | Enable Prometheus monitoring | `false` |
| `monitoring.prometheusPort` | Prometheus metrics port | `9000` |

## Bucket Initialization

Buckets are created using an init job that runs after MinIO is ready:

> **Note**: The bucket-init job waits for MinIO to become reachable before it creates buckets. On slower clusters or a fresh first boot, that can take a while, so the chart leaves the job without a hard deadline by default.
> The job also mounts `/tmp` as an `emptyDir` and sets `HOME=/tmp` plus `MC_CONFIG_DIR=/tmp/.mc` because it runs as a non-root user with a read-only root filesystem.

```yaml
buckets:
  - name: documents
    policy: none
  - name: backups
    policy: none
  - name: uploads
    policy: public
```

## Accessing MinIO

### Port Forward (Local)

```bash
# API port
kubectl port-forward svc/minio 9000:9000 -n development

# Console port
kubectl port-forward svc/minio 9001:9001 -n development
```

### Get Credentials

```bash
# Get the root user
kubectl get secret minio -n development -o jsonpath='{.data.root-user}' | base64 -d

# Get the root password
kubectl get secret minio -n development -o jsonpath='{.data.root-password}' | base64 -d
```

### Use mc Client

```bash
# Configure mc alias
mc alias set myminio http://localhost:9000 minioadmin <password>

# List buckets
mc ls myminio

# Upload file
mc cp myfile.txt myminio/documents/
```

### Open Console

```bash
# Port forward console
kubectl port-forward svc/minio 9001:9001 -n development

# Open browser
open http://localhost:9001
```

## Environment Variables

Applications can connect to MinIO using these environment variables:

```yaml
env:
  - name: MINIO_ENDPOINT
    value: "http://minio.development.svc.cluster.local:9000"
  - name: MINIO_ROOT_USER
    valueFrom:
      secretKeyRef:
        name: minio
        key: root-user
  - name: MINIO_ROOT_PASSWORD
    valueFrom:
      secretKeyRef:
        name: minio
        key: root-password
```

### AWS SDK Example (Python)

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://minio.development.svc.cluster.local:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='<password>'
)

# List buckets
buckets = s3.list_buckets()
for bucket in buckets['Buckets']:
    print(bucket['Name'])
```

## Production Considerations

### High Availability

1. **Use Distributed Mode**: Deploy with 4+ replicas for HA
2. **Enable Pod Anti-Affinity**: Spread pods across nodes
3. **Use Appropriate Storage**: Fast storage (SSD) for better performance
4. **Resource Planning**: Allocate sufficient CPU and memory

### Security

1. **Use Existing Secrets**: Never hardcode credentials
2. **Network Policies**: Enable network isolation
3. **TLS**: Configure TLS for production deployments
4. **Access Control**: Use MinIO IAM policies

### Backup

1. **mc mirror**: Use mc mirror for bucket replication
2. **Snapshot**: Use storage class snapshots if available
3. **Cross-Cluster Replication**: Configure MinIO replication

## Upgrading

```bash
helm upgrade minio ./helm/charts/minio \
  -f values-production.yaml \
  -n production
```

## Uninstalling

```bash
helm uninstall minio -n development
```

> **Warning**: This will delete all data. Ensure you have backups.

## License

Apache 2.0
