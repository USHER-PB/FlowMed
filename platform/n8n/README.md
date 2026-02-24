# n8n Workflow Automation

n8n provides workflow automation for the OM Platform, handling approvals, notifications, and complex multi-step processes.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    n8n in OM Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Event Sources              n8n Engine              Actions     │
│  ┌─────────────┐         ┌───────────────┐      ┌────────────┐  │
│  │ Kubernetes  │────────▶│               │─────▶│ Slack      │  │
│  │ Events      │         │   Workflow    │      │ PagerDuty  │  │
│  ├─────────────┤         │   Processing  │      │ Jira       │  │
│  │ GitHub      │────────▶│               │─────▶│ GitHub     │  │
│  │ Webhooks    │         │   - Approval  │      │ ArgoCD     │  │
│  ├─────────────┤         │   - Routing   │      │ Kubernetes │  │
│  │ Prometheus  │────────▶│   - Enrich    │─────▶│ Email      │  │
│  │ Alerts      │         │   - Transform │      │ AWS        │  │
│  ├─────────────┤         │               │      │ Terraform  │  │
│  │ ArgoCD      │────────▶│               │─────▶│ Custom API │  │
│  │ Hooks       │         │               │      │            │  │
│  └─────────────┘         └───────────────┘      └────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Workflows

### Deployment Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `prod-deploy-approval` | ArgoCD sync to *-prod | Slack approval → ArgoCD sync |
| `deploy-notification` | ArgoCD sync complete | Slack notification with details |
| `rollback-alert` | ArgoCD rollback detected | PagerDuty + Slack alert |

### Onboarding Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `team-onboarding` | GitHub issue created | Create Tenant → Slack invite → Jira project |
| `member-onboarding` | Tenant CR updated | RBAC update → Slack notification |
| `team-offboarding` | Tenant CR deleted | Cleanup → Archive → Notify |

### Service Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `service-provisioning` | ServiceRequest created | Approval (if prod) → Provision → Notify |
| `service-ready` | Service status Ready | Send connection details to team |
| `service-failure` | Service provisioning failed | Alert team + platform |

### Alerting Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `critical-alert` | Prometheus critical alert | PagerDuty + Slack + Email |
| `warning-alert` | Prometheus warning alert | Slack with runbook link |
| `cost-alert` | Daily schedule | Calculate costs → Alert over-budget teams |

## Installation

n8n is deployed via ArgoCD as part of the platform infrastructure:

```bash
# n8n is included in platform-apps
argocd app sync n8n
```

## Configuration

### Environment Variables

```yaml
# Configured via Kubernetes Secret
N8N_BASIC_AUTH_ACTIVE: "true"
N8N_ENCRYPTION_KEY: "<from-secret>"
WEBHOOK_URL: "https://n8n.platform.example.com"
```

### Integrations

Configure these credentials in n8n:

| Integration | Purpose | Credential Type |
|-------------|---------|-----------------|
| Slack | Notifications | OAuth2 |
| GitHub | Repo operations | OAuth2 / PAT |
| Kubernetes | Cluster operations | Service Account |
| ArgoCD | Deployments | API Token |
| PagerDuty | Alerting | API Key |
| Jira | Ticket management | OAuth2 |
| AWS | Cloud operations | Access Keys / IRSA |

## Creating Workflows

### Import Existing Templates

```bash
# Templates are in platform/n8n/templates/
# Import via n8n UI or API
```

### Webhook URLs

Workflows with webhook triggers are available at:
```
https://n8n.platform.example.com/webhook/<workflow-id>
```

## Directory Structure

```
platform/n8n/
├── README.md                    # This file
├── workflows/                   # Workflow JSON exports
│   ├── deployment/
│   │   ├── prod-approval.json
│   │   └── deploy-notify.json
│   ├── onboarding/
│   │   ├── team-onboard.json
│   │   └── member-onboard.json
│   ├── service/
│   │   ├── provision-approval.json
│   │   └── service-ready.json
│   └── alerting/
│       ├── critical-alert.json
│       └── cost-report.json
└── templates/                   # Reusable workflow templates
    ├── slack-approval.json
    └── k8s-resource-create.json
```

## Security

- n8n runs in the `platform` namespace
- Credentials stored in Kubernetes Secrets
- Webhook endpoints require authentication
- RBAC limits n8n service account permissions
