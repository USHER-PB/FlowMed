# OM - Organization Management Platform

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Terraform](https://img.shields.io/badge/Terraform-1.6+-purple.svg)](https://terraform.io)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28+-blue.svg)](https://kubernetes.io)
[![ArgoCD](https://img.shields.io/badge/ArgoCD-2.9+-orange.svg)](https://argoproj.github.io/cd/)

> **A comprehensive SRE/Platform Engineering toolkit for deploying, managing, and monitoring infrastructure at scale.**

## Overview

OM (Operation and Maintenance) is a centralized deployment platform designed for platform engineering teams. It provides a complete GitOps-based infrastructure management solution with integrated security, monitoring, and compliance capabilities.

### Key Features

- **Infrastructure as Code** - Terraform modules for AWS, GCP, and Azure
- **GitOps Deployments** - ArgoCD-based continuous delivery
- **Kubernetes Native** - Helm charts for all platform components
- **Comprehensive Monitoring** - Prometheus, Grafana, and Alertmanager stack
- **Security First** - OPA policies, Wazuh SIEM, cert-manager, and network policies
- **VPN Integration** - NetBird mesh VPN with AdGuard DNS filtering
- **CI/CD Pipelines** - GitHub Actions workflows for automation

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OM Platform Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   GitHub     │───▶│   ArgoCD     │───▶│  Kubernetes  │                   │
│  │   Actions    │    │   (GitOps)   │    │   Clusters   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                    │                          │
│         │                   │                    │                          │
│         ▼                   ▼                    ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  Terraform   │    │    Helm      │    │  Prometheus  │                   │
│  │   Modules    │    │   Charts     │    │   + Grafana  │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                    │                          │
│         └───────────────────┼────────────────────┘                          │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Security Layer                               │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │   OPA   │  │ Wazuh   │  │  Cert   │  │ NetBird │  │ AdGuard │    │    │
│  │  │ Policy  │  │  SIEM   │  │ Manager │  │   VPN   │  │   DNS   │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- [Terraform](https://terraform.io) >= 1.6
- [kubectl](https://kubernetes.io/docs/tasks/tools/) >= 1.28
- [Helm](https://helm.sh) >= 3.12
- [ArgoCD CLI](https://argo-cd.readthedocs.io/en/stable/cli_installation/)
- [AWS CLI](https://aws.amazon.com/cli/) or cloud provider CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/skyengpro/om.git
cd om

# Initialize Terraform
cd terraform/environments/dev
terraform init

# Deploy infrastructure
terraform plan -out=tfplan
terraform apply tfplan

# Install ArgoCD bootstrap
kubectl apply -k argocd/bootstrap/

# Sync applications
argocd app sync platform-apps
```

## Project Structure

```
om/
├── terraform/                    # Infrastructure as Code
│   ├── modules/                  # Reusable Terraform modules
│   │   ├── kubernetes/           # Kubernetes cluster provisioning
│   │   ├── networking/           # VPC, subnets, security groups
│   │   ├── compute/              # EC2, VMs, instances
│   │   ├── storage/              # S3, EBS, persistent storage
│   │   └── iam/                  # IAM roles and policies
│   ├── environments/             # Environment-specific configs
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── examples/                 # Usage examples
│
├── helm/                         # Helm Charts
│   ├── charts/                   # Custom Helm charts
│   │   ├── base-app/             # Generic application chart
│   │   ├── monitoring-stack/     # Prometheus + Grafana
│   │   └── security-stack/       # Security tools
│   └── values/                   # Environment-specific values
│       ├── dev/
│       ├── staging/
│       └── prod/
│
├── argocd/                       # GitOps Configuration
│   ├── apps/                     # Application definitions
│   ├── applicationsets/          # ApplicationSet templates
│   ├── projects/                 # ArgoCD projects
│   └── bootstrap/                # Initial ArgoCD setup
│
├── monitoring/                   # Observability Stack
│   ├── prometheus/               # Prometheus configuration
│   │   ├── rules/                # Recording rules
│   │   └── alerts/               # Alert rules
│   ├── grafana/                  # Grafana configuration
│   │   ├── dashboards/           # JSON dashboards
│   │   └── datasources/          # Data source configs
│   └── alertmanager/             # Alert routing
│
├── security/                     # Security Configuration
│   ├── opa-policies/             # Open Policy Agent policies
│   ├── wazuh/                    # Wazuh SIEM configuration
│   ├── cert-manager/             # Certificate management
│   ├── rbac/                     # Kubernetes RBAC
│   └── network-policies/         # Network segmentation
│
├── scripts/                      # Automation Scripts
│   ├── setup/                    # Initial setup scripts
│   ├── deploy/                   # Deployment helpers
│   ├── maintenance/              # Maintenance tasks
│   └── testing/                  # Test scripts
│
├── configs/                      # Configuration Files
│   ├── environments/             # Environment configs
│   └── secrets-templates/        # Secret templates (no values)
│
├── docs/                         # Documentation
│   ├── architecture/             # Architecture decisions
│   ├── getting-started/          # Onboarding guides
│   ├── customization/            # Customization guides
│   ├── runbooks/                 # Operational runbooks
│   └── adr/                      # Architecture Decision Records
│
└── .github/                      # GitHub Configuration
    ├── workflows/                # CI/CD pipelines
    ├── ISSUE_TEMPLATE/           # Issue templates
    └── PULL_REQUEST_TEMPLATE/    # PR templates
```

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started/README.md) | Initial setup and configuration |
| [Architecture](docs/architecture/README.md) | System design and decisions |
| [Customization](docs/customization/README.md) | How to customize for your needs |
| [Runbooks](docs/runbooks/README.md) | Operational procedures |
| [ADR](docs/adr/README.md) | Architecture Decision Records |

### Tutorials

| Tutorial | Description |
|----------|-------------|
| [AdGuard + NetBird Integration](docs/tutorial/deploying_and_integrating_adguard_with_netbird.md) | Deploy DNS filtering with VPN |
| [Reference: AdGuard + NetBird Deep Dive](docs/reference/adguard_netbird_deep_dive.md) | Advanced technical reference |

## Technology Stack

| Category | Tools |
|----------|-------|
| **Infrastructure** | Terraform, AWS/GCP/Azure |
| **Container Orchestration** | Kubernetes, EKS/GKE/AKS |
| **GitOps** | ArgoCD, Kustomize |
| **CI/CD** | GitHub Actions |
| **Package Management** | Helm |
| **Monitoring** | Prometheus, Grafana, Alertmanager |
| **Logging** | Loki, Fluentd |
| **Security** | OPA, Wazuh, Falco, cert-manager |
| **Networking** | NetBird VPN, AdGuard DNS |
| **Secrets** | External Secrets Operator, HashiCorp Vault |

## Environments

| Environment | Purpose | Cluster |
|-------------|---------|---------|
| **dev** | Development and testing | Single-node |
| **staging** | Pre-production validation | Multi-node |
| **prod** | Production workloads | HA Multi-node |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

See the [GitHub Projects](https://github.com/skyengpro/om/projects) for our planned features and milestones.

### Upcoming Features

- [ ] Multi-cloud support (GCP, Azure)
- [ ] Service mesh integration (Istio/Linkerd)
- [ ] GitOps secrets management
- [ ] Automated disaster recovery
- [ ] Cost optimization dashboards

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/skyengpro/om/issues)
- **Discussions**: [GitHub Discussions](https://github.com/skyengpro/om/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with care by the Platform Engineering Team**
