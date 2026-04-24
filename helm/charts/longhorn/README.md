# Longhorn Helm Chart

A local wrapper chart for Longhorn distributed block storage. Provides cloud-native distributed storage for local development and on-prem deployments.

## Overview

Longhorn is a lightweight, reliable, and powerful cloud-native distributed block storage system for Kubernetes. It provides:

- **Distributed block storage** with synchronous replication
- **Snapshots and backups** to S3/NFS targets
- **Automated failover** and self-healing
- **UI dashboard** for management

## When to Use

| Environment | Storage Solution |
|-------------|------------------|
| **Local/Dev** | Longhorn (this chart) |
| **On-Prem** | Longhorn (this chart) |
| **AWS EKS** | EBS CSI Driver |
| **GCP GKE** | GCE PD CSI Driver |
| **Azure AKS** | Azure Disk CSI Driver |

## Quick Start

### 1. Install Longhorn

```bash
helm dependency build ./helm/charts/longhorn
helm install longhorn ./helm/charts/longhorn \
  -n longhorn-system --create-namespace
```

### 2. Verify Installation

```bash
kubectl get pods -n longhorn-system
kubectl get storageclass
```

### 3. Use with Your Applications

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `longhorn.enabled` | Enable Longhorn deployment | `true` |
| `longhorn.defaultSettings.defaultReplicaCount` | Number of volume replicas | `2` |
| `longhorn.persistence.defaultFsType` | Filesystem type | `ext4` |
| `longhorn.persistence.defaultClass` | Set as default storage class | `true` |

### Resource Management

| Parameter | Description | Default |
|-----------|-------------|---------|
| `longhorn.longhornManager.resources.requests.cpu` | CPU request | `100m` |
| `longhorn.longhornManager.resources.requests.memory` | Memory request | `256Mi` |
| `longhorn.longhornDriver.resources.requests.cpu` | CPU request | `50m` |
| `longhorn.longhornDriver.resources.requests.memory` | Memory request | `128Mi` |

### UI Access

| Parameter | Description | Default |
|-----------|-------------|---------|
| `longhorn.ui.service.type` | Service type | `ClusterIP` |
| `longhorn.ingress.enabled` | Enable ingress | `false` |
| `longhorn.ingress.host` | Ingress hostname | `longhorn.local` |

## Using with data-store Chart

To use Longhorn with the PostgreSQL and MinIO charts:

```bash
helm install data-store ./helm/charts/data-store \
  --set postgres.persistence.storageClass=longhorn \
  --set minio.persistence.storageClass=longhorn \
  -n data-store --create-namespace
```

## Production Considerations

### High Availability

```yaml
longhorn:
  defaultSettings:
    defaultReplicaCount: 3
  persistence:
    defaultClassReplicaCount: 3
```

### Backup Configuration

```yaml
longhorn:
  defaultSettings:
    backupTarget: "s3://my-backup-bucket@us-east-1/"
```

### Resource Limits

```yaml
longhorn:
  longhornManager:
    resources:
      limits:
        cpu: 1000m
        memory: 1Gi
```

## Requirements

- Kubernetes 1.21+
- Nodes with available local storage
- `open-iscsi` installed on all nodes (for iSCSI support)
- `nfs-client` (if using NFS backup target)

### Pre-flight Check

```bash
# Check if nodes have required packages
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/prerequisite.yaml
```

## Troubleshooting

### Pods stuck in Pending

1. Check node requirements:
   ```bash
   kubectl describe node <node-name> | grep -A5 "Conditions"
   ```

2. Verify open-iscsi is installed:
   ```bash
   kubectl exec -it -n longhorn-system <longhorn-manager-pod> -- iscsiadm --version
   ```

### Volume Creation Fails

1. Check available storage:
   ```bash
   kubectl get nodes -o yaml | grep -A10 "allocatable"
   ```

2. Check Longhorn UI for volume status

## Reference

- [Official Documentation](https://longhorn.io/docs/)
- [Chart Source](https://github.com/longhorn/longhorn/tree/master/chart)
- [GitHub Repository](https://github.com/longhorn/longhorn)

## License

Apache-2.0
