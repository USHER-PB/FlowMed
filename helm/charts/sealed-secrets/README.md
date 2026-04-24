# Sealed Secrets Helm Chart

GitOps-friendly secrets management using Bitnami Sealed Secrets. Allows you to encrypt secrets that can be stored in Git and decrypted in-cluster.

## Overview

Sealed Secrets provides a solution for storing encrypted secrets in Git while maintaining GitOps workflows. The controller running in the cluster can decrypt these secrets, but nobody with access to the Git repository can.

## Features

- **GitOps-Friendly**: Store encrypted secrets in Git safely
- **Asymmetric Encryption**: Public key for encryption, private key in cluster for decryption
- **Namespace-Scoped**: Secrets are decrypted in specific namespaces
- **Automatic Renewal**: Keys are automatically rotated
- **Kubeseal CLI**: Easy-to-use command-line tool for sealing secrets

## Quick Start

### 1. Install the Controller

```bash
# Build dependencies first
helm dependency build ./helm/charts/sealed-secrets

# Install the chart
helm install sealed-secrets ./helm/charts/sealed-secrets \
  -n sealed-secrets --create-namespace
```

### 2. Install kubeseal CLI

**macOS:**
```bash
brew install kubeseal
```

**Linux:**
```bash
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.26.0/kubeseal-0.26.0-linux-amd64.tar.gz
tar -xzf kubeseal-0.26.0-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

**Windows:**
```powershell
choco install kubeseal
```

### 3. Create a Sealed Secret

```bash
# Create a regular secret (dry-run)
kubectl create secret generic db-credentials \
  --from-literal=username=appuser \
  --from-literal=password=supersecret \
  -n production --dry-run=client -o yaml > secret.yaml

# Seal it (encrypts using the controller's public key)
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml

# Apply the sealed secret (safe to commit to Git)
kubectl apply -f sealed-secret.yaml

# The controller will automatically unseal it
kubectl get secret db-credentials -n production
```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sealed-secrets.enabled` | Enable the controller | `true` |
| `sealed-secrets.replicaCount` | Number of replicas | `1` |
| `sealed-secrets.keyrenewperiod` | Key renewal interval | `720h` (30 days) |

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sealed-secrets.image.registry` | Image registry | `docker.io` |
| `sealed-secrets.image.repository` | Image repository | `bitnami/sealed-secrets-controller` |
| `sealed-secrets.image.tag` | Image tag | `v0.26.0` |

### Resources

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sealed-secrets.resources.limits.cpu` | CPU limit | `200m` |
| `sealed-secrets.resources.limits.memory` | Memory limit | `200Mi` |
| `sealed-secrets.resources.requests.cpu` | CPU request | `50m` |
| `sealed-secrets.resources.requests.memory` | Memory request | `50Mi` |

### Security

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sealed-secrets.securityContext.runAsNonRoot` | Run as non-root | `true` |
| `sealed-secrets.securityContext.runAsUser` | User ID | `1001` |
| `sealed-secrets.secretInheritance` | Allow cross-namespace secrets | `true` |

### Service

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sealed-secrets.service.type` | Service type | `ClusterIP` |
| `sealed-secrets.service.port` | Service port | `8080` |

### Ingress (for public key access)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sealed-secrets.ingress.enabled` | Enable ingress | `false` |
| `sealed-secrets.ingress.className` | Ingress class | `""` |

## Usage Examples

### Database Credentials

```bash
# Create and seal database credentials
kubectl create secret generic rds-credentials \
  --from-literal=username=dbadmin \
  --from-literal=password=$(openssl rand -base64 32) \
  -n production --dry-run=client -o yaml | kubeseal > sealed-rds.yaml

# Apply
kubectl apply -f sealed-rds.yaml
```

### S3 Credentials

```bash
# Create and seal S3 credentials
kubectl create secret generic s3-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  -n production --dry-run=client -o yaml | kubeseal > sealed-s3.yaml

# Apply
kubectl apply -f sealed-s3.yaml
```

### Multi-Environment Secrets

```bash
# Seal for specific namespace
kubeseal --namespace staging < secret.yaml > sealed-staging.yaml
kubeseal --namespace production < secret.yaml > sealed-production.yaml
```

## Offline Sealing

For CI/CD pipelines without cluster access:

```bash
# Fetch the public key (one-time setup)
kubeseal --fetch-cert > sealed-secrets.pub

# Seal offline using the public key
kubeseal --cert sealed-secrets.pub < secret.yaml > sealed-secret.yaml
```

## Key Management

### Backup the Private Key

```bash
# Get the private key (CRITICAL - store securely!)
kubectl get secret -n sealed-secrets sealed-secrets-key -o yaml > key-backup.yaml

# Store this file in a secure location (NOT in Git!)
```

### Restore from Backup

```bash
# Apply the backup key before installing the controller
kubectl apply -f key-backup.yaml -n sealed-secrets

# Then install the controller
helm install sealed-secrets ./helm/charts/sealed-secrets -n sealed-secrets
```

### Key Rotation

Keys are automatically rotated every 30 days by default. To manually rotate:

```bash
# Trigger key renewal
kubectl annotate secret -n sealed-secrets sealed-secrets-key force-renew=true --overwrite

# Restart the controller
kubectl rollout restart deployment sealed-secrets -n sealed-secrets
```

## Security Best Practices

1. **Backup the Private Key**: Store securely outside the cluster
2. **Never Commit Private Keys**: Only sealed secrets go in Git
3. **Use Namespace-Scoped Secrets**: Limit blast radius
4. **Restrict Controller Access**: Use RBAC to limit who can access the controller
5. **Monitor Key Expiry**: Set up alerts for key rotation

## Troubleshooting

### Check Controller Status

```bash
kubectl get pods -n sealed-secrets -l app.kubernetes.io/name=sealed-secrets
kubectl logs -n sealed-secrets -l app.kubernetes.io/name=sealed-secrets
```

### Check Sealed Secret Status

```bash
# List all sealed secrets
kubectl get sealedsecrets -A

# Get details of a specific sealed secret
kubectl describe sealedsecret db-credentials -n production

# Check if secret was unsealed
kubectl get secret db-credentials -n production
```

### Common Issues

1. **Secret not unsealing**: Check controller logs for errors
2. **Wrong namespace**: Sealed secrets are namespace-specific
3. **Key mismatch**: Ensure you're using the correct public key

## Upgrading

```bash
helm dependency update ./helm/charts/sealed-secrets
helm upgrade sealed-secrets ./helm/charts/sealed-secrets -n sealed-secrets
```

## Uninstalling

```bash
helm uninstall sealed-secrets -n sealed-secrets

# Note: The private key secret is NOT deleted automatically
# Keep it if you plan to reinstall and need to decrypt existing sealed secrets
```

## References

- [Sealed Secrets GitHub](https://github.com/bitnami-labs/sealed-secrets)
- [kubeseal Documentation](https://github.com/bitnami-labs/sealed-secrets#kubeseal)
- [Best Practices](https://github.com/bitnami-labs/sealed-secrets#how-do-i-handle-multiple-environments)

## License

Apache-2.0
