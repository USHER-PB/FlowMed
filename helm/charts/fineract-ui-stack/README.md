# Fineract UI Stack Chart

Helm chart for deploying Apache Fineract UI applications (Wave 7).

## Overview

This chart deploys 10 frontend applications for Apache Fineract:

| Application | Description | Default |
|-------------|-------------|---------|
| Portal | Main entry point and dashboard | Enabled |
| Web App | Primary banking operations interface | **Disabled** |
| Admin | Administrative functions | Enabled |
| Self-Service | Customer self-service portal | **Disabled** |
| Account Management | Account operations | Enabled |
| Accounting | Financial accounting interface | Enabled |
| Reporting | Reports and analytics | Enabled |
| Branch | Branch operations | Enabled |
| Cashier | Teller operations | Enabled |
| Asset | Asset management | Enabled |

## Prerequisites

- Kubernetes 1.24+
- Helm 3.0+
- NGINX Ingress Controller
- cert-manager (for TLS certificates)
- Fineract Core (Wave 4) deployed
- Keycloak (Wave 1) configured

## Installation

### Quick Start

```bash
# Install with default values
helm upgrade --install fineract-ui-stack ./helm/charts/fineract-ui-stack \
  -n fineract \
  --create-namespace

# Install with custom domain
helm upgrade --install fineract-ui-stack ./helm/charts/fineract-ui-stack \
  -n fineract \
  --set global.domain=fineract.mycompany.com \
  --set global.apiEndpoint=https://api.fineract.mycompany.com
```

### Enable Disabled Applications

Web App and Self-Service are disabled by default. Enable them with:

```bash
helm upgrade --install fineract-ui-stack ./helm/charts/fineract-ui-stack \
  -n fineract \
  --set webApp.enabled=true \
  --set selfService.enabled=true
```

## Configuration

### Global Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.domain` | Base domain for all applications | `example.com` |
| `global.apiEndpoint` | Fineract API endpoint URL | `https://api.fineract.example.com` |
| `global.keycloak.url` | Keycloak server URL | `https://keycloak.example.com` |
| `global.keycloak.realm` | Keycloak realm name | `fineract` |

### Common UI Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ui.image.repository` | Default image repository | `nginx` |
| `ui.image.tag` | Default image tag | `1.25-alpine` |
| `ui.resources.requests.cpu` | CPU request | `50m` |
| `ui.resources.requests.memory` | Memory request | `64Mi` |
| `ui.resources.limits.cpu` | CPU limit | `200m` |
| `ui.resources.limits.memory` | Memory limit | `256Mi` |
| `ui.replicaCount` | Default replica count | `2` |

### Per-Application Settings

Each UI application supports the following configuration:

| Parameter | Description |
|-----------|-------------|
| `enabled` | Enable/disable the application |
| `image.repository` | Container image repository |
| `image.tag` | Container image tag |
| `hostname` | Ingress hostname |
| `keycloak.clientId` | Keycloak OIDC client ID |
| `tls.enabled` | Enable TLS |
| `tls.secretName` | TLS secret name |

### Example: Custom Configuration

```yaml
# values-prod.yaml
global:
  domain: fineract.mycompany.com
  apiEndpoint: https://api.fineract.mycompany.com
  keycloak:
    url: https://keycloak.mycompany.com
    realm: fineract

ui:
  replicaCount: 3
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

portal:
  enabled: true
  hostname: portal.fineract.mycompany.com

webApp:
  enabled: true
  hostname: app.fineract.mycompany.com

admin:
  enabled: true
  hostname: admin.fineract.mycompany.com
```

## Architecture

Each UI application consists of:

- **Deployment**: NGINX container serving static files
- **Service**: ClusterIP service on port 80
- **Ingress**: Hostname-based routing with TLS
- **ConfigMap**: Application configuration (config.json)

The UI applications communicate with the Fineract Core API (Wave 4) through the NGINX Gateway.

## Dependencies

- **Wave 4**: Fineract Core must be deployed first
- **Wave 1**: Keycloak must be configured with appropriate clients
- **Wave 0**: PostgreSQL (indirect dependency via Fineract Core)

## Secrets Management

The UI stack relies on secrets created by the Fineract Core (Wave 4) deployment. No additional secrets are required for the UI applications.

### Keycloak Client Secrets

Each UI application requires a Keycloak client to be configured. The clients are referenced by their `clientId` in the values.yaml:

| Application | Default Client ID | Description |
|-------------|-------------------|-------------|
| Portal | `fineract-portal` | Main dashboard client |
| Web App | `fineract-web-app` | Banking operations client |
| Admin | `fineract-admin` | Administrative client |
| Self-Service | `fineract-self-service` | Customer portal client |
| Account Management | `fineract-account-management` | Account operations client |
| Accounting | `fineract-accounting` | Financial accounting client |
| Reporting | `fineract-reporting` | Reports and analytics client |
| Branch | `fineract-branch` | Branch operations client |
| Cashier | `fineract-cashier` | Teller operations client |
| Asset | `fineract-asset` | Asset management client |

### Creating Keycloak Clients

Keycloak clients should be created in the `fineract` realm with the following settings:

1. **Create client** in Keycloak admin console:
   - Client ID: `fineract-portal` (or appropriate app client)
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Valid Redirect URIs: `https://<app-hostname>/*`
   - Web Origins: `https://<app-hostname>`

2. **Example using kubectl and Keycloak REST API**:
```bash
# Get Keycloak admin token
TOKEN=$(curl -s https://keycloak.example.com/realms/master/protocol/openid-connect/token \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r .access_token)

# Create client for Portal UI
curl -X POST https://keycloak.example.com/admin/realms/fineract/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "fineract-portal",
    "publicClient": true,
    "redirectUris": ["https://portal.fineract.example.com/*"],
    "webOrigins": ["https://portal.fineract.example.com"],
    "standardFlowEnabled": true
  }'
```

### SealedSecrets for Keycloak (Optional)

If using SealedSecrets for Keycloak client secrets (for confidential clients):

```bash
# Create sealed secret for a confidential client
kubectl create secret generic fineract-portal-client-secret \
  --from-literal=clientSecret='your-client-secret' \
  --namespace fineract \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret-portal-client.yaml

kubectl apply -f sealed-secret-portal-client.yaml
```

## Troubleshooting

### Application Not Accessible

1. Check Ingress status: `kubectl get ingress -n fineract`
2. Verify DNS resolution for the hostname
3. Check TLS certificate: `kubectl get certificate -n fineract`

### Configuration Not Loading

1. Verify ConfigMap exists: `kubectl get configmap -n fineract`
2. Check ConfigMap content: `kubectl describe configmap <app-name>-config -n fineract`
3. Verify pod has mounted the ConfigMap

### Authentication Issues

1. Verify Keycloak is accessible from the UI
2. Check Keycloak client configuration
3. Verify redirect URIs match the application hostname

### Verifying Deployment

```bash
# Check all UI pods are running
kubectl get pods -n fineract -l app.kubernetes.io/part-of=fineract-ui-stack

# Check all ingress resources
kubectl get ingress -n fineract

# Verify ConfigMaps for each app
kubectl get configmap -n fineract

# Check TLS certificates
kubectl get certificate -n fineract
```
