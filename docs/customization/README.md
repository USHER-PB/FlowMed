# Customization Guide

This guide explains how to customize the OM Platform for your team's needs.

## Table of Contents

1. [Application Configuration](#application-configuration)
2. [Environment Overrides](#environment-overrides)
3. [Custom Resources](#custom-resources)
4. [Monitoring Customization](#monitoring-customization)
5. [Security Customization](#security-customization)
6. [Advanced Topics](#advanced-topics)

## Application Configuration

### Using the Base App Chart

The `base-app` Helm chart provides standardized deployment patterns:

```yaml
# apps/<team>/<app>/values.yaml
name: my-application
team: backend
environment: dev

image:
  repository: docker.io/myorg/myapp
  tag: "1.0.0"

replicaCount: 2

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Available Configuration Options

#### Deployment Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `strategy.type` | Deployment strategy | `RollingUpdate` |
| `strategy.rollingUpdate.maxSurge` | Max surge during update | `1` |
| `strategy.rollingUpdate.maxUnavailable` | Max unavailable | `0` |

#### Container Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Container image | Required |
| `image.tag` | Image tag | Required |
| `image.pullPolicy` | Pull policy | `IfNotPresent` |

#### Health Checks

```yaml
livenessProbe:
  enabled: true
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  enabled: true
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
```

#### Ingress Configuration

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com
```

## Environment Overrides

### Structure

```
apps/<team>/<app>/
├── values.yaml          # Base configuration
├── values-dev.yaml      # Development overrides
├── values-staging.yaml  # Staging overrides
└── values-prod.yaml     # Production overrides
```

### Example: Production Overrides

```yaml
# values-prod.yaml
replicaCount: 3

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

podDisruptionBudget:
  enabled: true
  minAvailable: 2

topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfied: DoNotSchedule
    labelSelector:
      matchLabels:
        app: myapp
```

## Custom Resources

### Adding ConfigMaps

```yaml
configMaps:
  enabled: true
  data:
    config.yaml: |
      server:
        port: 8080
      logging:
        level: info

configMapVolume:
  enabled: true
  mountPath: /config
```

### Adding Secrets

For production, use External Secrets Operator:

```yaml
# External secret reference
secretEnv:
  - name: DATABASE_URL
    secretName: myapp-db-credentials
    key: url
  - name: API_KEY
    secretName: myapp-api-key
    key: key
```

### Persistent Storage

```yaml
persistentVolumeClaims:
  - name: myapp-data
    accessModes:
      - ReadWriteOnce
    storageClassName: gp3
    size: 20Gi

volumes:
  - name: data
    persistentVolumeClaim:
      claimName: myapp-data

volumeMounts:
  - name: data
    mountPath: /data
```

## Monitoring Customization

### Custom ServiceMonitor

```yaml
serviceMonitor:
  enabled: true
  interval: 30s
  scrapeTimeout: 10s
  labels:
    team: backend
```

### Custom Prometheus Rules

Create `monitoring/prometheus/rules/<team>-rules.yaml`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: myapp-rules
  namespace: monitoring
spec:
  groups:
    - name: myapp.rules
      rules:
        - record: myapp:requests:rate5m
          expr: sum(rate(http_requests_total{app="myapp"}[5m]))

        - alert: MyAppHighErrorRate
          expr: |
            (
              sum(rate(http_requests_total{app="myapp",status=~"5.."}[5m]))
              /
              sum(rate(http_requests_total{app="myapp"}[5m]))
            ) > 0.05
          for: 5m
          labels:
            severity: warning
            team: backend
          annotations:
            summary: "High error rate for myapp"
```

### Custom Grafana Dashboard

1. Create dashboard JSON in `monitoring/grafana/dashboards/`
2. Add ConfigMap annotation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  myapp-dashboard.json: |
    { ... dashboard JSON ... }
```

## Security Customization

### Network Policies

```yaml
networkPolicy:
  enabled: true
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: http
    - from:
        - namespaceSelector:
            matchLabels:
              name: team-backend
          podSelector:
            matchLabels:
              app: other-service
      ports:
        - port: http
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - port: 5432
```

### Service Account with IRSA

```yaml
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/myapp-role
```

### Pod Security Context

```yaml
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

## Advanced Topics

### Sidecar Containers

```yaml
sidecars:
  - name: log-shipper
    image: fluent/fluent-bit:2.1
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
    volumeMounts:
      - name: logs
        mountPath: /var/log/app
```

### Init Containers

```yaml
initContainers:
  - name: wait-for-db
    image: busybox:1.36
    command: ['sh', '-c', 'until nc -z db.database 5432; do sleep 2; done']
```

### Custom Labels and Annotations

```yaml
commonLabels:
  cost-center: "engineering"
  data-classification: "internal"

commonAnnotations:
  owner: "backend-team@example.com"

podAnnotations:
  vault.hashicorp.com/agent-inject: "true"
```

### Autoscaling with Custom Metrics

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 20
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

## Next Steps

- Review [Architecture](../architecture/README.md)
- Check [Runbooks](../runbooks/README.md)
- See [ADR](../adr/README.md) for decision rationale
