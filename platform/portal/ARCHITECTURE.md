# Self-Service Developer Portal Architecture

## Executive Summary

This document outlines the architecture for a self-service developer portal that enables teams to onboard, deploy applications, and request platform services without manual intervention from the platform team.

## Recommended Solution: Backstage

We recommend **[Backstage](https://backstage.io)** (by Spotify) as the foundation for the self-service portal.

### Why Backstage?

| Criteria | Backstage | Port | Custom Solution |
|----------|-----------|------|-----------------|
| Maturity | High (CNCF Incubating) | Medium | Low |
| Kubernetes Integration | Excellent | Good | Variable |
| ArgoCD Integration | Native plugin | Via API | Custom |
| Service Catalog | Built-in | Built-in | Custom |
| Software Templates | Built-in | Built-in | Custom |
| Extensibility | Plugin system | Limited | Full control |
| Community | Very large | Growing | N/A |
| Cost | Open source | SaaS pricing | Development cost |
| Time to Deploy | 2-4 weeks | 1-2 weeks | 2-6 months |

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Self-Service Portal Architecture                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Backstage Portal                                │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │ Software │  │ Service  │  │  Tech    │  │Kubernetes│  │  ArgoCD  │   │ │
│  │  │ Catalog  │  │ Catalog  │  │  Docs    │  │ Plugin   │  │  Plugin  │   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │ │
│  │       │              │             │              │             │       │ │
│  │       └──────────────┼─────────────┼──────────────┼─────────────┘       │ │
│  │                      │             │              │                     │ │
│  │              ┌───────┴─────────────┴──────────────┴───────┐             │ │
│  │              │           Backstage Backend                 │            │ │
│  │              │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │             │ │
│  │              │  │  Auth   │  │ Scaffold│  │   Search    │ │             │ │
│  │              │  │ (OIDC)  │  │  Engine │  │   (TechDocs)│ │             │ │
│  │              │  └─────────┘  └─────────┘  └─────────────┘ │             │ │
│  │              └────────────────────────────────────────────┘             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                          Platform APIs                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │ Tenant   │  │ Service  │  │  ArgoCD  │  │Kubernetes│  │  GitHub  │   │ │
│  │  │Controller│  │ Catalog  │  │   API    │  │   API    │  │   API    │   │ │
│  │  │   API    │  │Controller│  │          │  │          │  │          │   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       Kubernetes Cluster                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │ │
│  │  │   Tenant    │  │  Service    │  │   ArgoCD    │  │  Team Apps  │     │ │
│  │  │  Resources  │  │  Instances  │  │Applications │  │             │     │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Software Catalog

The Software Catalog tracks all components, services, and their ownership.

```yaml
# Example: Component Registration
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: api-service
  description: Core API service
  annotations:
    backstage.io/techdocs-ref: dir:.
    argocd/app-name: backend-api-service
    github.com/project-slug: skyengpro/api-service
spec:
  type: service
  lifecycle: production
  owner: team-backend
  system: platform
  dependsOn:
    - resource:backend-postgresql
    - resource:backend-redis
  providesApis:
    - api-service-api
```

### 2. Software Templates (Scaffolding)

Templates enable teams to create new applications with best practices baked in.

```yaml
# Example: New Application Template
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: new-application
  title: Create New Application
  description: Bootstrap a new application with CI/CD, monitoring, and deployment
spec:
  owner: platform-team
  type: service

  parameters:
    - title: Application Information
      required:
        - name
        - team
        - description
      properties:
        name:
          title: Application Name
          type: string
          pattern: '^[a-z][a-z0-9-]{2,30}$'
        team:
          title: Owning Team
          type: string
          ui:field: OwnerPicker
        description:
          title: Description
          type: string

    - title: Technical Configuration
      properties:
        language:
          title: Programming Language
          type: string
          enum: [go, python, nodejs, java]
          default: go
        database:
          title: Database
          type: string
          enum: [none, postgresql, mongodb]
          default: none
        cache:
          title: Cache
          type: string
          enum: [none, redis]
          default: none

    - title: Deployment Configuration
      properties:
        environments:
          title: Environments
          type: array
          items:
            type: string
            enum: [dev, staging, prod]
          default: [dev]
        replicas:
          title: Initial Replicas
          type: integer
          default: 2

  steps:
    # Create GitHub repository
    - id: create-repo
      name: Create Repository
      action: github:repo:create
      input:
        repoUrl: github.com?owner=skyengpro&repo=${{ parameters.name }}

    # Generate application code
    - id: fetch-template
      name: Fetch Template
      action: fetch:template
      input:
        url: ./templates/${{ parameters.language }}
        values:
          name: ${{ parameters.name }}
          team: ${{ parameters.team }}

    # Create Helm values
    - id: create-values
      name: Create Deployment Values
      action: fetch:template
      input:
        url: ./templates/deployment
        targetPath: ./apps/${{ parameters.team }}/${{ parameters.name }}
        values:
          name: ${{ parameters.name }}
          team: ${{ parameters.team }}
          replicas: ${{ parameters.replicas }}

    # Register in catalog
    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.create-repo.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

  output:
    links:
      - title: Repository
        url: ${{ steps.create-repo.output.remoteUrl }}
      - title: Open in Catalog
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
```

### 3. Service Catalog Integration

Teams can request platform services through the portal.

```yaml
# Template: Request Database
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: request-database
  title: Request Database
  description: Request a managed database for your application
spec:
  owner: platform-team
  type: resource

  parameters:
    - title: Database Configuration
      required:
        - name
        - type
        - size
      properties:
        name:
          title: Database Name
          type: string
        type:
          title: Database Type
          type: string
          enum: [postgresql, mongodb]
        size:
          title: Size
          type: string
          enum: [small, medium, large]
        environment:
          title: Environment
          type: string
          enum: [dev, staging, prod]
          default: dev

  steps:
    - id: create-service-request
      name: Create Service Request
      action: kubernetes:create
      input:
        apiVersion: platform.om.io/v1alpha1
        kind: ServiceRequest
        metadata:
          name: ${{ parameters.name }}
          namespace: ${{ user.entity.metadata.annotations['platform.om.io/namespace'] }}
        spec:
          service: ${{ parameters.type }}
          size: ${{ parameters.size }}

  output:
    links:
      - title: View Service Request
        url: /catalog/default/resource/${{ parameters.name }}
```

### 4. Team Onboarding Template

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: onboard-team
  title: Onboard New Team
  description: Request platform access for a new team
spec:
  owner: platform-team
  type: team

  parameters:
    - title: Team Information
      required:
        - teamName
        - owner
        - costCenter
      properties:
        teamName:
          title: Team Name
          type: string
          pattern: '^[a-z][a-z0-9-]{2,20}$'
        displayName:
          title: Display Name
          type: string
        owner:
          title: Team Lead Email
          type: string
          format: email
        costCenter:
          title: Cost Center
          type: string

    - title: Subscription
      properties:
        tier:
          title: Resource Tier
          type: string
          enum: [starter, standard, enterprise]
          default: starter
          enumNames:
            - Starter (4 CPU, 8Gi RAM)
            - Standard (16 CPU, 32Gi RAM)
            - Enterprise (64 CPU, 128Gi RAM)
        environments:
          title: Environments
          type: array
          items:
            type: string
            enum: [dev, staging, prod]
          default: [dev]

    - title: Team Members
      properties:
        members:
          title: Team Members
          type: array
          items:
            type: object
            properties:
              email:
                type: string
                format: email
              role:
                type: string
                enum: [admin, developer, viewer]

  steps:
    - id: create-tenant
      name: Create Tenant
      action: kubernetes:create
      input:
        apiVersion: platform.om.io/v1alpha1
        kind: Tenant
        metadata:
          name: ${{ parameters.teamName }}
        spec:
          name: ${{ parameters.teamName }}
          displayName: ${{ parameters.displayName }}
          owner: ${{ parameters.owner }}
          tier: ${{ parameters.tier }}
          environments: ${{ parameters.environments }}
          costCenter: ${{ parameters.costCenter }}
          members: ${{ parameters.members }}

    - id: create-group
      name: Create Backstage Group
      action: catalog:register
      input:
        catalogInfoPath: |
          apiVersion: backstage.io/v1alpha1
          kind: Group
          metadata:
            name: ${{ parameters.teamName }}
          spec:
            type: team
            children: []
            members: ${{ parameters.members | map(m => m.email) }}

  output:
    links:
      - title: View Team
        url: /catalog/default/group/${{ parameters.teamName }}
      - title: Team Dashboard
        url: /dashboard/team/${{ parameters.teamName }}
```

## Plugin Architecture

### Required Backstage Plugins

| Plugin | Purpose | Integration |
|--------|---------|-------------|
| `@backstage/plugin-kubernetes` | View K8s resources | Kubernetes API |
| `@backstage/plugin-argocd` | View ArgoCD apps | ArgoCD API |
| `@backstage/plugin-github-actions` | View CI/CD | GitHub API |
| `@backstage/plugin-techdocs` | Documentation | GitHub/S3 |
| `@backstage/plugin-catalog` | Service catalog | Built-in |
| `@backstage/plugin-scaffolder` | Templates | Built-in |
| `@backstage/plugin-search` | Search | Built-in |
| `@roadiehq/backstage-plugin-prometheus` | Metrics | Prometheus API |
| `@roadiehq/backstage-plugin-grafana` | Dashboards | Grafana API |

### Custom Plugins to Develop

```
backstage/
├── plugins/
│   ├── tenant-management/     # Tenant CRUD operations
│   ├── service-catalog/       # Request platform services
│   ├── cost-dashboard/        # Team cost visualization
│   ├── slo-dashboard/         # SLO compliance
│   └── approval-workflow/     # Production approvals
```

## Authentication & Authorization

### OIDC Integration

```yaml
# app-config.yaml
auth:
  environment: production
  providers:
    oidc:
      development:
        metadataUrl: https://auth.example.com/.well-known/openid-configuration
        clientId: ${OIDC_CLIENT_ID}
        clientSecret: ${OIDC_CLIENT_SECRET}
        scope: 'openid profile email groups'

# Permission mapping
permission:
  enabled: true
  rules:
    - allow:
        - catalogEntityRead
      pluginId: catalog
    - allow:
        - scaffolderTemplateRead
        - scaffolderTemplateExecute
      pluginId: scaffolder
      conditions:
        - resourceType: scaffolder-template
          rules:
            - rule: isOwner
              params:
                claims:
                  - groups
```

### Role-Based Access

| Role | Permissions |
|------|-------------|
| Platform Admin | All operations |
| Team Admin | Manage team, create apps, request services |
| Developer | Deploy apps, view services |
| Viewer | Read-only access |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backstage Deployment                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Kubernetes Cluster                      │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │              backstage namespace                 │   │    │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │    │
│  │  │  │ Backstage  │  │ PostgreSQL │  │   Redis    │  │   │    │
│  │  │  │  (3 pods)  │  │ (catalog)  │  │  (cache)   │  │   │    │
│  │  │  └────────────┘  └────────────┘  └────────────┘  │   │    │
│  │  │         │                                        │   │    │
│  │  │         ▼                                        │   │    │
│  │  │  ┌────────────────────────────────────────────┐  │   │    │
│  │  │  │              Ingress                       │  │   │    │
│  │  │  │   portal.example.com (TLS via cert-mgr)    │  │   │    │
│  │  │  └────────────────────────────────────────────┘  │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Helm Values

```yaml
# backstage/values.yaml
backstage:
  replicas: 3

  image:
    registry: ghcr.io
    repository: skyengpro/backstage
    tag: latest

  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2
      memory: 2Gi

  extraEnvVars:
    - name: KUBERNETES_SERVICE_ACCOUNT_TOKEN
      valueFrom:
        secretKeyRef:
          name: backstage-sa-token
          key: token

  ingress:
    enabled: true
    className: nginx
    host: portal.example.com
    tls:
      enabled: true
      secretName: backstage-tls

postgresql:
  enabled: true
  auth:
    existingSecret: backstage-postgresql

serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/backstage-role
```

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

| Task | Owner | Duration |
|------|-------|----------|
| Deploy Backstage base | Platform | 3 days |
| Configure OIDC auth | Platform | 2 days |
| Set up PostgreSQL backend | Platform | 1 day |
| Configure Kubernetes plugin | Platform | 2 days |
| Configure ArgoCD plugin | Platform | 2 days |

### Phase 2: Catalog & Templates (Weeks 3-4)

| Task | Owner | Duration |
|------|-------|----------|
| Import existing services | Platform | 2 days |
| Create new-app template | Platform | 3 days |
| Create database request template | Platform | 2 days |
| Create team onboarding template | Platform | 2 days |
| Test templates end-to-end | Platform | 3 days |

### Phase 3: Custom Integrations (Weeks 5-6)

| Task | Owner | Duration |
|------|-------|----------|
| Develop Tenant plugin | Platform | 5 days |
| Develop Service Catalog plugin | Platform | 5 days |
| Integrate Prometheus/Grafana | Platform | 2 days |
| Develop cost dashboard | Platform | 3 days |

### Phase 4: Rollout (Weeks 7-8)

| Task | Owner | Duration |
|------|-------|----------|
| Pilot with 2 teams | Platform + Teams | 5 days |
| Gather feedback | Platform | 2 days |
| Iterate on UX | Platform | 3 days |
| Full rollout | Platform | 5 days |
| Documentation & training | Platform | 3 days |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to onboard team | < 1 hour | Tenant creation to first deploy |
| Time to deploy app | < 30 min | Template to running pod |
| Self-service rate | > 90% | Requests via portal vs manual |
| Developer satisfaction | > 4.0/5 | Survey |
| Portal uptime | 99.9% | Monitoring |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Plugin compatibility | Medium | Pin versions, test upgrades |
| Performance at scale | Medium | Caching, pagination |
| Auth integration issues | High | Test OIDC thoroughly |
| Template complexity | Medium | Start simple, iterate |

## Alternatives Considered

### 1. Port (getport.io)

**Pros**: SaaS, faster setup, good UX
**Cons**: SaaS cost, less customization, vendor lock-in

### 2. Custom React App

**Pros**: Full control, exact requirements
**Cons**: 6+ months development, maintenance burden

### 3. Kratix

**Pros**: Platform-as-Product, GitOps native
**Cons**: Less mature, smaller community

## Conclusion

Backstage provides the best balance of:
- Mature, battle-tested platform
- Extensive plugin ecosystem
- Strong Kubernetes/ArgoCD integration
- Active CNCF community
- Customization capability

The 8-week implementation plan delivers a fully functional self-service portal that significantly reduces platform team toil while empowering development teams.
