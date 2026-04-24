# Base Application Chart

A standardized Helm chart for deploying applications on the OM Platform.

## Overview

This chart provides a consistent deployment pattern for all teams deploying applications to the OM Platform. It includes:

- Deployment with configurable replicas and resources
- Service (ClusterIP/LoadBalancer/NodePort)
- Ingress with TLS support
- Horizontal Pod Autoscaler
- Pod Disruption Budget
- Service Account with IRSA support
- Network Policies
- Prometheus ServiceMonitor
- ConfigMaps and Secrets management

## Quick Start

### 1. Create Your Values File

Create a values file for your application:

```yaml
# my-app-values.yaml
name: my-app
team: backend
environment: dev

image:
  repository: my-registry/my-app
  tag: "1.0.0"

replicaCount: 2

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

service:
  enabled: true
  port: 80
  targetPort: 8080

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix
```

### 2. Deploy Your Application

```bash
# Build dependencies first (even if none currently specified)
helm dependency build ./helm/charts/base-app

# Using Helm directly
helm upgrade --install my-app ./helm/charts/base-app \
  -f my-app-values.yaml \
  -n my-team \
  --create-namespace

# Or using ArgoCD (recommended)
# See the ArgoCD section below
```

## Configuration

### Required Values

| Parameter | Description |
|-----------|-------------|
| `name` | Application name |
| `team` | Owning team name |
| `image.repository` | Container image repository |
| `image.tag` | Container image tag |

### Common Configuration Options

#### Deployment

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |

#### Service

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.enabled` | Enable Service | `true` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `service.targetPort` | Container port | `8080` |

#### Ingress

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable Ingress | `false` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.hosts` | Ingress hosts | `[]` |
| `ingress.tls` | TLS configuration | `[]` |

#### Autoscaling

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable HPA | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `1` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU % | `80` |

#### Health Checks

| Parameter | Description | Default |
|-----------|-------------|---------|
| `livenessProbe.enabled` | Enable liveness probe | `true` |
| `livenessProbe.httpGet.path` | Liveness path | `/health` |
| `readinessProbe.enabled` | Enable readiness probe | `true` |
| `readinessProbe.httpGet.path` | Readiness path | `/ready` |

## Examples

### Basic Web Application

```yaml
name: web-frontend
team: frontend
environment: prod

image:
  repository: my-registry/frontend
  tag: "2.0.0"

replicaCount: 3

service:
  enabled: true
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
```

### API Service with Database Connection

```yaml
name: api-service
team: backend
environment: prod

image:
  repository: my-registry/api
  tag: "1.5.0"

replicaCount: 2

env:
  - name: LOG_LEVEL
    value: "info"

secretEnv:
  - name: DATABASE_URL
    secretName: api-secrets
    key: database-url

service:
  enabled: true
  port: 80
  targetPort: 8080

livenessProbe:
  httpGet:
    path: /api/health
    port: http
  initialDelaySeconds: 60

readinessProbe:
  httpGet:
    path: /api/ready
    port: http

serviceMonitor:
  enabled: true
```

### Stateful Application with Persistence

```yaml
name: data-processor
team: data
environment: prod

image:
  repository: my-registry/processor
  tag: "3.0.0"

volumes:
  - name: data
    persistentVolumeClaim:
      claimName: processor-data

volumeMounts:
  - name: data
    mountPath: /data

persistentVolumeClaims:
  - name: processor-data
    accessModes:
      - ReadWriteOnce
    storageClassName: gp3
    size: 100Gi
```

## ArgoCD Deployment

For GitOps deployment, create an ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: my-team
  source:
    repoURL: https://github.com/skyengpro/om.git
    targetRevision: main
    path: helm/charts/base-app
    helm:
      valueFiles:
        - ../../../apps/my-team/my-app/values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: my-team
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Troubleshooting

### Pod Not Starting

1. Check pod events: `kubectl describe pod <pod-name>`
2. Check logs: `kubectl logs <pod-name>`
3. Verify image exists and is accessible
4. Check resource constraints

### Ingress Not Working

1. Verify ingress controller is running
2. Check ingress resource: `kubectl describe ingress <name>`
3. Verify DNS resolution
4. Check TLS certificate status

### Metrics Not Appearing

1. Verify ServiceMonitor is created
2. Check Prometheus targets
3. Ensure metrics endpoint is accessible
