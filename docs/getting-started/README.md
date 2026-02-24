# Getting Started with OM Platform

Welcome to the OM (Operation and Maintenance) Platform. This guide will help you get started with deploying applications using our centralized SRE platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Platform Overview](#platform-overview)
3. [Quick Start](#quick-start)
4. [Team Onboarding](#team-onboarding)
5. [Deploying Your First Application](#deploying-your-first-application)
6. [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following tools installed:

| Tool | Version | Purpose |
|------|---------|---------|
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | >= 1.28 | Kubernetes CLI |
| [Helm](https://helm.sh/docs/intro/install/) | >= 3.12 | Package manager |
| [ArgoCD CLI](https://argo-cd.readthedocs.io/en/stable/cli_installation/) | >= 2.9 | GitOps CLI |
| [AWS CLI](https://aws.amazon.com/cli/) | >= 2.0 | Cloud provider CLI |
| Git | >= 2.30 | Version control |

### Install Prerequisites (macOS)

```bash
# Using Homebrew
brew install kubectl helm argocd awscli git

# Verify installations
kubectl version --client
helm version
argocd version --client
aws --version
```

### Install Prerequisites (Linux)

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# ArgoCD CLI
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd && sudo mv argocd /usr/local/bin/
```

## Platform Overview

The OM Platform provides a GitOps-based deployment system with:

```
┌─────────────────────────────────────────────────────────────────┐
│                        OM Platform                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Your Code   │───▶│   GitHub     │───▶│   ArgoCD     │       │
│  │  + Values    │    │   (CI/CD)    │    │   (GitOps)   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                 │                │
│                                                 ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Kubernetes Cluster                    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │  Your   │  │ Ingress │  │ Metrics │  │ Secrets │    │    │
│  │  │  App    │  │ NGINX   │  │ Prom/   │  │ Manager │    │    │
│  │  │         │  │         │  │ Grafana │  │         │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| **ArgoCD** | GitOps continuous delivery |
| **Ingress NGINX** | External traffic routing |
| **Prometheus/Grafana** | Monitoring and dashboards |
| **cert-manager** | TLS certificate automation |
| **OPA Gatekeeper** | Policy enforcement |

## Quick Start

### 1. Configure kubectl Access

```bash
# Get cluster credentials (provided by Platform team)
aws eks update-kubeconfig --region us-east-1 --name om-platform-dev

# Verify access
kubectl get nodes
```

### 2. Access ArgoCD

```bash
# Port-forward ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d

# Login via CLI
argocd login localhost:8080 --insecure
```

Open https://localhost:8080 in your browser.

### 3. Access Monitoring

```bash
# Grafana
kubectl port-forward svc/prometheus-stack-grafana -n monitoring 3000:80 &
# Default: admin / prom-operator

# Prometheus
kubectl port-forward svc/prometheus-stack-kube-prom-prometheus -n monitoring 9090:9090 &
```

## Team Onboarding

### Step 1: Request Access

1. Open a [Team Onboarding Issue](https://github.com/skyengpro/om/issues/new?template=team_onboarding.yaml)
2. Fill out the required information
3. Wait for Platform team approval

### Step 2: Set Up Your Team Namespace

Once approved, you'll receive:
- A dedicated namespace (e.g., `team-backend`)
- ArgoCD project access
- RBAC roles for your team members

### Step 3: Clone the Repository

```bash
git clone https://github.com/skyengpro/om.git
cd om
```

### Step 4: Create Your Application Directory

```bash
# Create your team's app directory
mkdir -p apps/<team-name>/<app-name>
```

## Deploying Your First Application

### 1. Create Application Values

Create `apps/<team-name>/<app-name>/values.yaml`:

```yaml
# Application metadata
name: my-app
team: backend
environment: dev

# Container image
image:
  repository: docker.io/myorg/my-app
  tag: "1.0.0"

# Replicas
replicaCount: 2

# Resource requests/limits
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Service configuration
service:
  enabled: true
  port: 80
  targetPort: 8080

# Ingress (optional)
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: my-app.dev.example.com
      paths:
        - path: /
          pathType: Prefix

# Health checks
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30

readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 5
```

### 2. Create ArgoCD Application (Optional - Auto-created by ApplicationSet)

If using manual application creation:

```yaml
# argocd/apps/<team-name>-<app-name>.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-my-app
  namespace: argocd
spec:
  project: team-backend
  source:
    repoURL: https://github.com/skyengpro/om.git
    targetRevision: main
    path: helm/charts/base-app
    helm:
      valueFiles:
        - ../../../apps/backend/my-app/values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: team-backend
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### 3. Commit and Push

```bash
git add apps/<team-name>/<app-name>/
git commit -m "feat: add my-app deployment"
git push origin main
```

### 4. Verify Deployment

```bash
# Check ArgoCD
argocd app get <team-name>-<app-name>

# Check pods
kubectl get pods -n <team-namespace>

# Check service
kubectl get svc -n <team-namespace>

# Check ingress
kubectl get ingress -n <team-namespace>
```

## Environment-Specific Configuration

Create environment-specific values files:

```
apps/backend/my-app/
├── values.yaml          # Base values
├── values-dev.yaml      # Development overrides
├── values-staging.yaml  # Staging overrides
└── values-prod.yaml     # Production overrides
```

Example `values-prod.yaml`:

```yaml
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

ingress:
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: my-app-tls
      hosts:
        - my-app.example.com
```

## Next Steps

- Read the [Customization Guide](../customization/README.md)
- Review [Architecture Documentation](../architecture/README.md)
- Check [Runbooks](../runbooks/README.md) for operational procedures
- Set up [Monitoring Dashboards](../customization/monitoring.md)

## Getting Help

- **Documentation**: Check the `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/skyengpro/om/issues)
- **Slack**: #platform-support (internal)
- **On-Call**: platform-oncall@example.com
