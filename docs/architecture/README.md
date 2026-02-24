# OM Platform Architecture

This document describes the architecture of the OM (Operation and Maintenance) Platform.

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Infrastructure Architecture](#infrastructure-architecture)
4. [GitOps Architecture](#gitops-architecture)
5. [Security Architecture](#security-architecture)
6. [Monitoring Architecture](#monitoring-architecture)
7. [Networking Architecture](#networking-architecture)

## Overview

The OM Platform is a centralized SRE platform that enables teams to deploy and manage applications using GitOps principles. It provides:

- **Infrastructure as Code**: All infrastructure defined in Terraform
- **GitOps Deployments**: ArgoCD-based continuous delivery
- **Self-Service**: Teams deploy via Git pull requests
- **Observability**: Integrated monitoring and alerting
- **Security**: Policy enforcement and compliance

## Design Principles

### 1. GitOps First

All configuration and deployment state is stored in Git:
- Infrastructure definitions in `terraform/`
- Application configurations in `apps/` and `helm/`
- ArgoCD syncs desired state from Git to cluster

### 2. Self-Service with Guardrails

Teams can deploy independently within platform boundaries:
- Standardized Helm chart templates
- OPA policies enforce security requirements
- Resource quotas prevent overconsumption

### 3. Environment Parity

Consistent infrastructure across environments:
- Same Terraform modules for dev/staging/prod
- Environment-specific values files
- Automated promotion workflows

### 4. Observability by Default

All applications get monitoring automatically:
- Prometheus metrics collection
- Grafana dashboards
- Alert routing to teams

## Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Account                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                              VPC                                     │    │
│  │                         10.0.0.0/16                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                    Public Subnets                            │    │    │
│  │  │   10.0.0.0/24    10.0.1.0/24    10.0.2.0/24                 │    │    │
│  │  │   ┌─────────┐    ┌─────────┐    ┌─────────┐                 │    │    │
│  │  │   │   NAT   │    │   NAT   │    │   NAT   │                 │    │    │
│  │  │   │Gateway  │    │Gateway  │    │Gateway  │                 │    │    │
│  │  │   └─────────┘    └─────────┘    └─────────┘                 │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                   Private Subnets                            │    │    │
│  │  │   10.0.100.0/24  10.0.101.0/24  10.0.102.0/24               │    │    │
│  │  │   ┌─────────────────────────────────────────────────────┐   │    │    │
│  │  │   │              EKS Cluster                             │   │    │    │
│  │  │   │   ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐        │   │    │    │
│  │  │   │   │ Node  │  │ Node  │  │ Node  │  │ Node  │        │   │    │    │
│  │  │   │   │   1   │  │   2   │  │   3   │  │   n   │        │   │    │    │
│  │  │   │   └───────┘  └───────┘  └───────┘  └───────┘        │   │    │    │
│  │  │   └─────────────────────────────────────────────────────┘   │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| VPC | Network isolation | AWS VPC |
| EKS | Kubernetes cluster | Amazon EKS |
| Node Groups | Worker nodes | EC2 instances |
| NAT Gateway | Outbound internet | AWS NAT |
| Load Balancer | Ingress traffic | AWS NLB |

### Terraform Module Structure

```
terraform/
├── modules/
│   ├── kubernetes/     # EKS cluster
│   ├── networking/     # VPC, subnets
│   ├── compute/        # EC2 resources
│   ├── storage/        # S3, EBS
│   └── iam/            # IAM roles
└── environments/
    ├── dev/
    ├── staging/
    └── prod/
```

## GitOps Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           GitOps Flow                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────────┐      │
│   │Developer│───▶│  Git    │───▶│ GitHub  │───▶│ ArgoCD          │      │
│   │         │    │ Commit  │    │ Actions │    │ (Sync to K8s)   │      │
│   └─────────┘    └─────────┘    └─────────┘    └─────────────────┘      │
│                       │              │                    │              │
│                       │              │                    │              │
│                       ▼              ▼                    ▼              │
│               ┌───────────────────────────────────────────────────┐     │
│               │                    Kubernetes                      │     │
│               │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │     │
│               │  │team-     │  │team-     │  │ platform │         │     │
│               │  │backend   │  │frontend  │  │ infra    │         │     │
│               │  └──────────┘  └──────────┘  └──────────┘         │     │
│               └───────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### App of Apps Pattern

```yaml
platform-apps (Root)
├── platform-infrastructure
│   ├── cert-manager
│   ├── ingress-nginx
│   └── monitoring-stack
├── team-backend
│   ├── api-service
│   └── worker
└── team-frontend
    └── web-app
```

### Sync Strategy

| Type | Behavior |
|------|----------|
| Automated Sync | ArgoCD automatically applies changes |
| Self-Heal | Drift is automatically corrected |
| Prune | Deleted resources are removed |
| Retry | Failed syncs are retried |

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Security Layers                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    Network Security                          │     │
│  │  • Network Policies (default deny)                          │     │
│  │  • Security Groups (AWS)                                    │     │
│  │  • Private subnets for workloads                            │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                              │                                        │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                   Admission Control                          │     │
│  │  • OPA Gatekeeper policies                                  │     │
│  │  • Pod Security Standards                                   │     │
│  │  • Image validation                                         │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                              │                                        │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    Runtime Security                          │     │
│  │  • Wazuh agents (SIEM)                                      │     │
│  │  • Container scanning                                       │     │
│  │  • Audit logging                                            │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                              │                                        │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                   Secrets Management                         │     │
│  │  • External Secrets Operator                                │     │
│  │  • cert-manager (TLS)                                       │     │
│  │  • IRSA (AWS IAM)                                           │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Security Policies

| Policy | Enforcement |
|--------|-------------|
| No privileged containers | OPA/Gatekeeper |
| Run as non-root | OPA/Gatekeeper |
| Resource limits required | OPA/Gatekeeper |
| Approved registries only | OPA/Gatekeeper |
| No latest tag | OPA/Gatekeeper |

## Monitoring Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Observability Stack                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                     Metrics Pipeline                           │   │
│  │   ┌──────────┐    ┌──────────┐    ┌──────────┐               │   │
│  │   │ Service  │───▶│Prometheus│───▶│ Grafana  │               │   │
│  │   │ Monitors │    │          │    │          │               │   │
│  │   └──────────┘    └──────────┘    └──────────┘               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                     Alerting Pipeline                          │   │
│  │   ┌──────────┐    ┌───────────┐    ┌─────────────────┐       │   │
│  │   │Prometheus│───▶│Alertmgr   │───▶│ Slack/PagerDuty │       │   │
│  │   │  Rules   │    │           │    │                 │       │   │
│  │   └──────────┘    └───────────┘    └─────────────────┘       │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Metrics

| Category | Metrics |
|----------|---------|
| Application | Request rate, error rate, latency |
| Resources | CPU, memory, disk usage |
| Kubernetes | Pod health, replica count |
| SLI/SLO | Availability, latency percentiles |

## Networking Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Networking Flow                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   Internet                                                            │
│       │                                                               │
│       ▼                                                               │
│   ┌───────────┐                                                       │
│   │   NLB     │  (AWS Network Load Balancer)                         │
│   └───────────┘                                                       │
│       │                                                               │
│       ▼                                                               │
│   ┌───────────────────────────────────────────────────────────┐      │
│   │              Ingress NGINX Controller                      │      │
│   │   • TLS termination                                       │      │
│   │   • Path-based routing                                    │      │
│   │   • Rate limiting                                         │      │
│   └───────────────────────────────────────────────────────────┘      │
│       │                                                               │
│       ▼                                                               │
│   ┌───────────────────────────────────────────────────────────┐      │
│   │                  Kubernetes Services                       │      │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐                  │      │
│   │   │ app-svc │  │ api-svc │  │ web-svc │                  │      │
│   │   └─────────┘  └─────────┘  └─────────┘                  │      │
│   └───────────────────────────────────────────────────────────┘      │
│       │                                                               │
│       ▼                                                               │
│   ┌───────────────────────────────────────────────────────────┐      │
│   │                       Pods                                 │      │
│   └───────────────────────────────────────────────────────────┘      │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Network Policies

Default deny with explicit allow:
- Allow DNS egress to kube-system
- Allow ingress from ingress-nginx namespace
- Allow Prometheus scraping from monitoring namespace

## Related Documentation

- [Getting Started](../getting-started/README.md)
- [Customization Guide](../customization/README.md)
- [ADR Records](../adr/README.md)
