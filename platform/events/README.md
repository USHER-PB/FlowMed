# Platform Events

This directory contains event definitions, handlers, and triggers for the OM Platform automation system.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Platform Event Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Event Sources                Event Bus                  Event Handlers     │
│   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐      │
│   │ Kubernetes  │──────────▶│             │──────────▶│   n8n       │      │
│   │ API Server  │           │             │           │  Workflows  │      │
│   └─────────────┘           │             │           └─────────────┘      │
│   ┌─────────────┐           │   Webhooks  │           ┌─────────────┐      │
│   │   ArgoCD    │──────────▶│      +      │──────────▶│  Slack Bot  │      │
│   │   Events    │           │   Events    │           │             │      │
│   └─────────────┘           │             │           └─────────────┘      │
│   ┌─────────────┐           │             │           ┌─────────────┐      │
│   │ Prometheus  │──────────▶│             │──────────▶│  PagerDuty  │      │
│   │   Alerts    │           │             │           │             │      │
│   └─────────────┘           └─────────────┘           └─────────────┘      │
│   ┌─────────────┐                                     ┌─────────────┐      │
│   │   GitHub    │────────────────────────────────────▶│  Jira       │      │
│   │  Webhooks   │                                     │             │      │
│   └─────────────┘                                     └─────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Event Types

### Kubernetes Events

| Event | Source | Handler |
|-------|--------|---------|
| `tenant.created` | Tenant Controller | `team-onboard.json` |
| `tenant.updated` | Tenant Controller | `member-onboard.json` |
| `tenant.deleted` | Tenant Controller | `team-offboard.json` |
| `servicerequest.created` | Service Catalog | `service-provision.json` |
| `servicerequest.ready` | Service Catalog | `service-ready.json` |
| `pod.crashloopbackoff` | Kubernetes | `pod-crash-alert.json` |

### ArgoCD Events

| Event | Source | Handler |
|-------|--------|---------|
| `app.sync.requested` | ArgoCD | `prod-approval.json` |
| `app.sync.succeeded` | ArgoCD | `deploy-notify.json` |
| `app.sync.failed` | ArgoCD | `deploy-failed.json` |
| `app.health.degraded` | ArgoCD | `health-alert.json` |

### Alertmanager Events

| Event | Source | Handler |
|-------|--------|---------|
| `alert.firing.critical` | Prometheus | `critical-alert.json` |
| `alert.firing.warning` | Prometheus | `warning-alert.json` |
| `alert.resolved` | Prometheus | `alert-resolved.json` |

### GitHub Events

| Event | Source | Handler |
|-------|--------|---------|
| `issue.labeled.approved` | GitHub | `team-onboard.json` |
| `pull_request.merged` | GitHub | `pr-merged.json` |

## Directory Structure

```
platform/events/
├── README.md                 # This file
├── handlers/                 # Event handler definitions
│   ├── kubernetes/
│   │   ├── tenant-events.yaml
│   │   └── pod-events.yaml
│   ├── argocd/
│   │   └── sync-events.yaml
│   └── alertmanager/
│       └── alert-events.yaml
└── triggers/                 # Event trigger configurations
    ├── webhooks.yaml         # Webhook endpoints
    └── schedules.yaml        # Scheduled triggers
```

## Configuring Event Handlers

### Kubernetes Events

Events from Kubernetes are captured using:

1. **Argo Events** - For complex event processing
2. **n8n Webhooks** - For simple webhook-based triggers
3. **Kubernetes Event Watcher** - For pod/deployment events

Example EventSource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: tenant-events
  namespace: platform
spec:
  resource:
    tenant:
      namespace: ""
      group: platform.om.io
      version: v1alpha1
      resource: tenants
      eventTypes:
        - ADD
        - UPDATE
        - DELETE
```

### ArgoCD Events

Configure ArgoCD notifications:

```yaml
# argocd-notifications-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  trigger.on-sync-status-unknown: |
    - when: app.status.sync.status == 'Unknown'
      send: [n8n-webhook]

  service.webhook.n8n: |
    url: https://n8n.platform.example.com/webhook/argocd-sync-hook
    headers:
      - name: Content-Type
        value: application/json
```

### Alertmanager Events

Configure Alertmanager to send to n8n:

```yaml
# alertmanager.yaml
receivers:
  - name: n8n-webhook
    webhook_configs:
      - url: https://n8n.platform.example.com/webhook/alertmanager-webhook
        send_resolved: true
```

## Scheduled Events

Define scheduled triggers in `triggers/schedules.yaml`:

```yaml
schedules:
  - name: daily-cost-report
    cron: "0 9 * * 1-5"  # 9 AM weekdays
    workflow: cost-report.json

  - name: weekly-compliance-scan
    cron: "0 6 * * 1"    # 6 AM Monday
    workflow: compliance-scan.json

  - name: hourly-health-check
    cron: "0 * * * *"    # Every hour
    workflow: health-check.json
```

## Adding New Events

1. Define the event source in `handlers/`
2. Create the n8n workflow in `platform/n8n/workflows/`
3. Configure the webhook/trigger in `triggers/`
4. Test the event flow end-to-end
5. Document in this README
