# Keycloak Deployment Guide

This guide explains how to deploy Keycloak on a new Kubernetes cluster from scratch.

## Prerequisites

Before deploying Keycloak, ensure the following infrastructure components are running:

1. **Sealed Secrets Controller** - For encrypting secrets in git
2. **CloudNativePG** - PostgreSQL operator for database management
3. **Longhorn** - Storage provider for persistent volumes
4. **MetalLB** - Load balancer for LoadBalancer services
5. **Ingress NGINX** - Ingress controller for HTTP routing

## Step 1: Create SealedSecrets for the New Cluster

SealedSecrets are encrypted with a cluster-specific key. When deploying to a new cluster, you must re-encrypt all secrets.

### Required Secrets

| Secret Name | Keys | Description |
|-------------|------|-------------|
| `keycloak-db-credentials` | `username`, `password` | CloudNativePG managed role credentials (type: `kubernetes.io/basic-auth`) |
| `keycloak-postgres` | `KEYCLOAK_DB_USER`, `KEYCLOAK_DB_PASSWORD` | Keycloak database credentials for the chart |
| `keycloak-keycloak` | `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD` | Keycloak admin credentials |
| `keycloak-realm-credentials` | `MIFOS_PASSWORD`, `REALM_ADMIN_PASSWORD`, `E2E_KYC_PASSWORD`, `E2E_MOBILE_PASSWORD` | Realm user passwords (min 8 chars) |
| `keycloak-keybound` | `KEYBOUND_AUTH_USERNAME`, `KEYBOUND_AUTH_PASSWORD`, `KEYBOUND_SIGNATURE_SECRET` | Keybound plugin credentials |
| `oauth2-proxy-secrets` | `client-secret` | OAuth2 proxy client secret |
| `asset-service-credentials` | `keycloak-client-secret` | Asset service client secret |
| `payment-gateway-credentials` | `keycloak-client-secret` | Payment gateway client secret |
| `customer-self-service-credentials` | `keycloak-client-secret` | Customer self-service client secret |
| `user-sync-credentials` | `keycloak-client-secret` | User sync service client secret |
| `kyc-manager-credentials` | `keycloak-client-secret` | KYC manager client secret |
| `fineract-config-credentials` | `keycloak-client-secret`, `oauth2-client-secret` | Fineract config service secrets |

### Creating SealedSecrets

```bash
# Set your kubeconfig
export KUBECONFIG=~/.kube/your-cluster.yaml

# 1. Create CloudNativePG managed role secret (must be basic-auth type)
kubectl create secret generic keycloak-db-credentials \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=keycloak \
  --from-literal=password='your-secure-password' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/keycloak-db-credentials.yaml

# 2. Create Keycloak postgres secret
kubectl create secret generic keycloak-postgres \
  --from-literal=KEYCLOAK_DB_USER=keycloak \
  --from-literal=KEYCLOAK_DB_PASSWORD='your-secure-password' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/keycloak-postgres.yaml

# 3. Create Keycloak admin secret
kubectl create secret generic keycloak-keycloak \
  --from-literal=KEYCLOAK_ADMIN=admin \
  --from-literal=KEYCLOAK_ADMIN_PASSWORD='admin123' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/keycloak-admin.yaml

# 4. Create realm credentials (passwords must be 8+ characters for dev policy)
kubectl create secret generic keycloak-realm-credentials \
  --from-literal=MIFOS_PASSWORD='mifos1234' \
  --from-literal=REALM_ADMIN_PASSWORD='realm_admin123' \
  --from-literal=E2E_KYC_PASSWORD='e2e_kyc123' \
  --from-literal=E2E_MOBILE_PASSWORD='e2e_mobile123' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/keycloak-realm-credentials.yaml

# 5. Create keybound credentials
kubectl create secret generic keycloak-keybound \
  --from-literal=KEYBOUND_AUTH_USERNAME=keybound \
  --from-literal=KEYBOUND_AUTH_PASSWORD='keybound123' \
  --from-literal=KEYBOUND_SIGNATURE_SECRET='random-signature-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/keycloak-keybound.yaml

# 6. Create client secrets for services
kubectl create secret generic oauth2-proxy-secrets \
  --from-literal=client-secret='oauth2-proxy-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/oauth2-proxy-secrets.yaml

kubectl create secret generic asset-service-credentials \
  --from-literal=keycloak-client-secret='asset-service-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/asset-service-credentials.yaml

kubectl create secret generic payment-gateway-credentials \
  --from-literal=keycloak-client-secret='payment-gateway-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/payment-gateway-credentials.yaml

kubectl create secret generic customer-self-service-credentials \
  --from-literal=keycloak-client-secret='customer-self-service-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/customer-self-service-credentials.yaml

kubectl create secret generic user-sync-credentials \
  --from-literal=keycloak-client-secret='user-sync-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/user-sync-credentials.yaml

kubectl create secret generic kyc-manager-credentials \
  --from-literal=keycloak-client-secret='kyc-manager-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/kyc-manager-credentials.yaml

kubectl create secret generic fineract-config-credentials \
  --from-literal=keycloak-client-secret='fineract-config-secret' \
  --from-literal=oauth2-client-secret='fineract-config-secret' \
  --namespace=fineract \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace=kube-system \
    --controller-name=sealed-secrets \
    -o yaml > configs/sealed-secrets/fineract-config-credentials.yaml
```

### Apply SealedSecrets to Cluster

```bash
kubectl apply -f configs/sealed-secrets/ --kubeconfig ~/.kube/your-cluster.yaml
```

## Step 2: Create Keycloak Database and User

### Add Managed Role to CloudNativePG Cluster

Patch the existing PostgreSQL cluster to create the keycloak user:

```bash
kubectl patch cluster data-store-postgres -n fineract --type=merge --patch '
spec:
  managed:
    roles:
    - name: keycloak
      ensure: present
      login: true
      createdb: true
      passwordSecret:
        name: keycloak-db-credentials
' --kubeconfig ~/.kube/your-cluster.yaml
```

### Create the Keycloak Database

Connect to PostgreSQL and create the database:

```bash
# Get the primary pod
PRIMARY_POD=$(kubectl get pods -n fineract -l postgresql.cnpg.io/role=primary -o jsonpath='{.items[0].metadata.name}' --kubeconfig ~/.kube/your-cluster.yaml)

# Create the database
kubectl exec -n fineract $PRIMARY_POD --kubeconfig ~/.kube/your-cluster.yaml -- psql -U postgres -c "CREATE DATABASE keycloak OWNER keycloak;"
```

## Step 3: Deploy Keycloak

```bash
# Deploy with Helm
helm upgrade --install keycloak helm/charts/keycloak -n fineract \
  --kubeconfig ~/.kube/your-cluster.yaml \
  -f helm/charts/keycloak/values.yaml
```

## Step 4: Verify Deployment

```bash
# Check pods are running
kubectl get pods -n fineract --kubeconfig ~/.kube/your-cluster.yaml

# Check Keycloak realm is accessible
kubectl run curl-test --rm -it --restart=Never --image=curlimages/curl:latest \
  -n fineract --kubeconfig ~/.kube/your-cluster.yaml -- \
  curl -s http://keycloak:8080/realms/fineract/.well-known/openid-configuration
```

## Configuration Reference

### values.yaml Key Settings

```yaml
secrets:
  mode: existing  # Use pre-created secrets instead of generating

postgres:
  enabled: true
  host: data-store-postgres-rw.fineract.svc.cluster.local
  database: keycloak
  existingSecret: keycloak-postgres

keycloak:
  enabled: true
  existingSecret: keycloak-keycloak

keycloakConfig:
  enabled: true
  environment: dev  # dev | uat | prod
  sslRequired: "none"  # Set "EXTERNAL" for HTTPS environments
```

### Password Policy

The realm configuration has different password policies per environment:

- **dev**: `length(8)` - minimum 8 characters
- **prod**: `length(12) and digits and specialChars and upperCase and lowerCase and notUsername`

Ensure all realm user passwords meet the minimum length requirement for the target environment.

## Troubleshooting

### Config Job Fails with CreateContainerConfigError

Check for missing secrets:

```bash
kubectl describe pod -n fineract -l app.kubernetes.io/component=keycloak-config
```

Look for `Error: secret "xxx" not found` or `Error: couldn't find key xxx in Secret`.

### Config Job Fails with invalidPasswordMinLengthMessage

The realm user passwords don't meet the password policy. Update `keycloak-realm-credentials` secret with passwords that are at least 8 characters.

### Helm Lock Error

If Helm shows "another operation is in progress":

```bash
# Check the lock status
kubectl get secret -n fineract -l owner=helm

# Rollback to last good release
helm rollback keycloak <version> -n fineract --kubeconfig ~/.kube/your-cluster.yaml
```

## Related Documentation

- [CloudNativePG Keycloak User Issue Runbook](./runbooks/cloudnative-pg-keycloak-user-issue.md)
- [Keycloak Deployment Issues and Fixes](./keycloak-deployment-issues-and-fixes.md)
