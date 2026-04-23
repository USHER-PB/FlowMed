# Fineract Core Deployment Guide

This guide provides step-by-step instructions for deploying the Fineract Core banking engine on local Kubernetes clusters (kind, minikube, k3s) using Sealed Secrets for secret management.

## Prerequisites

Before deploying this chart, ensure you have the following:

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| kind / minikube / k3s | Latest | Local Kubernetes cluster |
| helm | v3.12+ | Package manager |
| kubectl | v1.28+ | Kubernetes CLI |
| kubeseal | v0.24+ | Sealed Secrets client |

### Required Infrastructure

The following components must be deployed in previous waves:

| Component | Wave | Namespace | Purpose |
|-----------|------|-----------|---------|
| PostgreSQL | Wave 0 | `database` | Primary database |
| Redis | Wave 2 | `cache` | Cache layer |
| Keycloak | Wave 1 | `identity` | Identity provider |

### Verify Prerequisites

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify PostgreSQL is running
kubectl get pods -n database -l app.kubernetes.io/name=postgresql

# Verify Redis is running
kubectl get pods -n cache -l app.kubernetes.io/name=redis

# Verify Keycloak is running
kubectl get pods -n identity -l app.kubernetes.io/name=keycloak
```

## Step 1: Install Sealed Secrets Controller

The Sealed Secrets controller must be installed before creating secrets.

```bash
# Add the Bitnami Helm repository
helm repo add bitnami https://charts.bitnami.com/bitnami

# Update repository
helm repo update

# Install the Sealed Secrets controller
helm install sealed-secrets-controller bitnami/sealed-secrets \
  --namespace kube-system \
  --set fullnameOverride=sealed-secrets-controller

# Verify the controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=sealed-secrets

# Wait for the controller to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=sealed-secrets -n kube-system --timeout=60s
```

## Step 2: Create Sealed Secrets

This chart requires four SealedSecret resources. Create them in the target namespace before deploying the chart.

### 2.1 Create Namespace

```bash
# Create the fineract namespace
kubectl create namespace fineract
```

### 2.2 Database Secret

Create a SealedSecret for the database password:

```bash
# Create a temporary secret
kubectl create secret generic fineract-db-sealed \
  --from-literal=password='your-secure-db-password' \
  --namespace fineract \
  --dry-run=client -o yaml > db-secret.yaml

# Seal the secret
kubeseal --format=yaml < db-secret.yaml > fineract-db-sealed.yaml

# Apply the SealedSecret
kubectl apply -f fineract-db-sealed.yaml

# Clean up temporary files
rm db-secret.yaml fineract-db-sealed.yaml
```

**Example SealedSecret YAML:**

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: fineract-db-sealed
  namespace: fineract
spec:
  encryptedData:
    password: AgBfj8...encrypted-data...
```

### 2.3 Keycloak Secret

Create a SealedSecret for Keycloak client credentials:

```bash
# Create a temporary secret
kubectl create secret generic fineract-keycloak-sealed \
  --from-literal=clientId='fineract-api' \
  --from-literal=clientSecret='your-keycloak-client-secret' \
  --namespace fineract \
  --dry-run=client -o yaml > keycloak-secret.yaml

# Seal the secret
kubeseal --format=yaml < keycloak-secret.yaml > fineract-keycloak-sealed.yaml

# Apply the SealedSecret
kubectl apply -f fineract-keycloak-sealed.yaml

# Clean up temporary files
rm keycloak-secret.yaml fineract-keycloak-sealed.yaml
```

**Example SealedSecret YAML:**

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: fineract-keycloak-sealed
  namespace: fineract
spec:
  encryptedData:
    clientId: AgBfj8...encrypted-data...
    clientSecret: AgBfj8...encrypted-data...
```

### 2.4 OAuth2 Proxy Secret

Create a SealedSecret for OAuth2 Proxy configuration:

```bash
# Generate a cookie secret (32-byte base64 encoded)
COOKIE_SECRET=$(openssl rand -base64 32 | tr -d '\n')

# Create a temporary secret
kubectl create secret generic fineract-oauth2-proxy-sealed \
  --from-literal=clientId='fineract-oauth2' \
  --from-literal=clientSecret='your-oauth2-client-secret' \
  --from-literal=cookieSecret="${COOKIE_SECRET}" \
  --namespace fineract \
  --dry-run=client -o yaml > oauth2-proxy-secret.yaml

# Seal the secret
kubeseal --format=yaml < oauth2-proxy-secret.yaml > fineract-oauth2-proxy-sealed.yaml

# Apply the SealedSecret
kubectl apply -f fineract-oauth2-proxy-sealed.yaml

# Clean up temporary files
rm oauth2-proxy-secret.yaml fineract-oauth2-proxy-sealed.yaml
```

**Example SealedSecret YAML:**

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: fineract-oauth2-proxy-sealed
  namespace: fineract
spec:
  encryptedData:
    clientId: AgBfj8...encrypted-data...
    clientSecret: AgBfj8...encrypted-data...
    cookieSecret: AgBfj8...encrypted-data...
```

### 2.5 Fineract API Secret

Create a SealedSecret for Fineract API credentials:

```bash
# Create a temporary secret
kubectl create secret generic fineract-api-sealed \
  --from-literal=username='admin' \
  --from-literal=password='your-fineract-admin-password' \
  --namespace fineract \
  --dry-run=client -o yaml > api-secret.yaml

# Seal the secret
kubeseal --format=yaml < api-secret.yaml > fineract-api-sealed.yaml

# Apply the SealedSecret
kubectl apply -f fineract-api-sealed.yaml

# Clean up temporary files
rm api-secret.yaml fineract-api-sealed.yaml
```

**Example SealedSecret YAML:**

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: fineract-api-sealed
  namespace: fineract
spec:
  encryptedData:
    username: AgBfj8...encrypted-data...
    password: AgBfj8...encrypted-data...
```

### 2.6 Verify All Secrets

```bash
# List all SealedSecrets
kubectl get sealedsecrets -n fineract

# Expected output:
# NAME                         AGE
# fineract-db-sealed           1m
# fineract-keycloak-sealed     1m
# fineract-oauth2-proxy-sealed 1m
# fineract-api-sealed          1m
```

## Step 3: Configure values.yaml for Local Deployment

Create a `values-local.yaml` file for your local deployment:

```yaml
# values-local.yaml - Local development configuration

global:
  domain: local.test
  environment: development

# Database configuration - adjust to match your PostgreSQL service
database:
  host: postgresql-primary.database.svc.cluster.local
  port: 5432
  name: fineract
  username: fineract

# Redis configuration - adjust to match your Redis service
redis:
  host: redis-master.cache.svc.cluster.local
  port: 6379
  database: 0

# Gateway configuration
gateway:
  enabled: true
  ingress:
    enabled: true
    className: nginx
    hostname: api.fineract.local.test
    tls:
      enabled: false  # Disable TLS for local development

# OAuth2 Proxy configuration
oauth2Proxy:
  enabled: true
  keycloak:
    url: http://keycloak.identity.svc.cluster.local:8080
    realm: fineract
    clientId: fineract-api
  redirectUrl: http://api.fineract.local.test/oauth2/callback

# User Sync configuration
userSync:
  enabled: true
  keycloak:
    url: http://keycloak.identity.svc.cluster.local:8080
    realm: fineract

# Config CLI - disable for initial testing
configCli:
  enabled: false

# Resource limits for local development (reduced)
fineract:
  read:
    replicaCount: 1
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
  write:
    replicaCount: 1
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
  batch:
    replicaCount: 1
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
```

### Required Configuration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `global.domain` | Base domain for services | `local.test` |
| `database.host` | PostgreSQL service hostname | `postgresql-primary.database.svc.cluster.local` |
| `database.port` | PostgreSQL port | `5432` |
| `database.name` | Database name | `fineract` |
| `database.username` | Database username | `fineract` |
| `redis.host` | Redis service hostname | `redis-master.cache.svc.cluster.local` |
| `redis.port` | Redis port | `6379` |
| `gateway.ingress.hostname` | API gateway hostname | `api.fineract.local.test` |
| `oauth2Proxy.keycloak.url` | Keycloak URL | `http://keycloak.identity.svc.cluster.local:8080` |
| `oauth2Proxy.keycloak.realm` | Keycloak realm | `fineract` |

## Step 4: Deploy with Helm

### 4.1 Add Required Repositories

```bash
# Add the chart repository (if using a remote repository)
helm repo add fineract https://your-chart-repo.example.com
helm repo update
```

### 4.2 Install the Chart

```bash
# Install from local chart
helm install fineract-core ./helm/charts/fineract-core \
  --namespace fineract \
  --values values-local.yaml

# Or install with inline values
helm install fineract-core ./helm/charts/fineract-core \
  --namespace fineract \
  --set global.domain=local.test \
  --set database.host=postgresql-primary.database.svc.cluster.local \
  --set redis.host=redis-master.cache.svc.cluster.local \
  --set gateway.ingress.hostname=api.fineract.local.test
```

### 4.3 Upgrade an Existing Release

```bash
helm upgrade fineract-core ./helm/charts/fineract-core \
  --namespace fineract \
  --values values-local.yaml
```

## Step 5: Verify Deployment

### 5.1 Check Pod Status

```bash
# List all pods in the fineract namespace
kubectl get pods -n fineract

# Expected pods:
# NAME                                          READY   STATUS    RESTARTS   AGE
# fineract-core-read-xxx-xxx                    1/1     Running   0          2m
# fineract-core-write-xxx-xxx                   1/1     Running   0          2m
# fineract-core-batch-xxx-xxx                   1/1     Running   0          2m
# fineract-core-gateway-xxx-xxx                 1/1     Running   0          2m
# fineract-core-oauth2-proxy-xxx-xxx            1/1     Running   0          2m
# fineract-core-user-sync-xxx-xxx               1/1     Running   0          2m
```

### 5.2 Check Services

```bash
# List all services
kubectl get services -n fineract

# Expected services:
# NAME                         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
# fineract-core-read           ClusterIP   10.x.x.x        <none>        8080/TCP   2m
# fineract-core-write          ClusterIP   10.x.x.x        <none>        8080/TCP   2m
# fineract-core-batch          ClusterIP   10.x.x.x        <none>        8080/TCP   2m
# fineract-core-gateway        ClusterIP   10.x.x.x        <none>        80/TCP     2m
# fineract-core-oauth2-proxy   ClusterIP   10.x.x.x        <none>        4180/TCP   2m
# fineract-core-user-sync      ClusterIP   10.x.x.x        <none>        8081/TCP   2m
```

### 5.3 Check Ingress

```bash
# List ingress resources
kubectl get ingress -n fineract

# Expected ingress:
# NAME                    CLASS   HOSTS                        ADDRESS       PORTS   AGE
# fineract-core-gateway   nginx   api.fineract.local.test      192.168.x.x   80      2m
```

### 5.4 Test Health Endpoints

```bash
# Port-forward to the gateway service
kubectl port-forward -n fineract svc/fineract-core-gateway 8080:80 &

# Test the health endpoint
curl -s http://localhost:8080/fineract-provider/actuator/health

# Expected response:
# {"status":"UP"}
```

### 5.5 Check Logs

```bash
# Check Fineract Read logs
kubectl logs -n fineract -l app.kubernetes.io/component=fineract-read --tail=50

# Check Fineract Write logs
kubectl logs -n fineract -l app.kubernetes.io/component=fineract-write --tail=50

# Check Gateway logs
kubectl logs -n fineract -l app.kubernetes.io/component=gateway --tail=50

# Check OAuth2 Proxy logs
kubectl logs -n fineract -l app.kubernetes.io/component=oauth2-proxy --tail=50
```

## Troubleshooting

### Common Issues

#### Pods Stuck in Pending State

**Symptom:** Pods remain in `Pending` state.

**Possible Causes:**
- Insufficient cluster resources
- PVC not bound (if using persistent storage)
- Node selectors/taints not matching

**Solution:**
```bash
# Check pod events
kubectl describe pod -n fineract <pod-name>

# Check node resources
kubectl describe nodes

# Check PVC status (if applicable)
kubectl get pvc -n fineract
```

#### Pods in CrashLoopBackOff

**Symptom:** Pods restart repeatedly.

**Possible Causes:**
- Database connection failure
- Redis connection failure
- Missing secrets
- Configuration errors

**Solution:**
```bash
# Check pod logs
kubectl logs -n fineract <pod-name> --previous

# Verify secrets exist
kubectl get secrets -n fineract

# Verify database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h postgresql-primary.database.svc.cluster.local -U fineract -d fineract

# Verify Redis connectivity
kubectl run -it --rm debug --image=redis:7 --restart=Never -- \
  redis-cli -h redis-master.cache.svc.cluster.local ping
```

#### Database Connection Errors

**Symptom:** Logs show database connection failures.

**Solution:**
```bash
# Verify database secret exists
kubectl get secret fineract-db-sealed -n fineract -o jsonpath='{.data.password}' | base64 -d

# Verify database service is accessible
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nc -zv postgresql-primary.database.svc.cluster.local 5432

# Check database credentials
kubectl exec -it -n database deploy/postgresql-primary -- \
  psql -U fineract -d fineract -c "SELECT 1"
```

#### OAuth2 Proxy Authentication Failures

**Symptom:** 401/403 errors, authentication redirects fail.

**Solution:**
```bash
# Verify Keycloak is accessible
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -s http://keycloak.identity.svc.cluster.local:8080/health

# Check OAuth2 Proxy logs
kubectl logs -n fineract -l app.kubernetes.io/component=oauth2-proxy --tail=100

# Verify OAuth2 Proxy secret
kubectl get secret fineract-oauth2-proxy-sealed -n fineract -o jsonpath='{.data.cookieSecret}' | base64 -d
```

#### Ingress Not Working

**Symptom:** Cannot access services via ingress hostname.

**Solution:**
```bash
# Check ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl describe ingress -n fineract

# Add hosts entry for local testing
echo "127.0.0.1 api.fineract.local.test" | sudo tee -a /etc/hosts

# For kind, port-forward the ingress controller
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 80:80
```

#### SealedSecret Not Unsealing

**Symptom:** SealedSecret exists but Secret is not created.

**Solution:**
```bash
# Check Sealed Secrets controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=sealed-secrets

# Verify the SealedSecret is valid
kubectl describe sealedsecret -n fineract <sealed-secret-name>

# Check if controller has the private key
kubectl get secret -n kube-system sealed-secrets-key -o jsonpath='{.data.tls\.key}' | base64 -d | head -5
```

### Useful Commands

```bash
# Get all resources in the namespace
kubectl get all -n fineract

# Describe a specific deployment
kubectl describe deployment -n fineract fineract-core-read

# Check resource usage
kubectl top pods -n fineract

# Execute a shell in a pod
kubectl exec -it -n fineract deploy/fineract-core-read -- /bin/sh

# View all events in the namespace
kubectl get events -n fineract --sort-by='.lastTimestamp'

# Force restart a deployment
kubectl rollout restart deployment -n fineract fineract-core-read

# Rollback a deployment
kubectl rollout undo deployment -n fineract fineract-core-read
```

## Production Considerations

For production deployments, consider the following:

### Secret Management

- Use **External Secrets Operator** instead of Sealed Secrets for cloud environments
- Integrate with cloud secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- Enable secret rotation policies

### Resource Configuration

- Increase replica counts for high availability
- Configure horizontal pod autoscaling
- Set appropriate resource requests and limits based on workload

### Security

- Enable TLS for all ingress resources
- Use network policies to restrict traffic
- Configure pod security standards
- Enable audit logging

### Monitoring

- Deploy Prometheus and Grafana for monitoring
- Configure alerting rules
- Set up log aggregation (ELK, Loki)

### Backup

- Implement database backup strategies
- Configure disaster recovery procedures
- Test restore procedures regularly

## Next Steps

After successfully deploying Fineract Core:

1. Deploy the **fineract-ui-stack** chart (Wave 7) for UI applications
2. Configure Keycloak realm and clients
3. Set up monitoring and alerting
4. Configure backup and disaster recovery
5. Run integration tests to verify the deployment
