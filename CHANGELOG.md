# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.0] - 2024-02-24

### Added

#### Infrastructure as Code
- Terraform modules for AWS EKS cluster provisioning
- Terraform modules for VPC and networking (subnets, NAT, VPC endpoints)
- Environment-specific configurations (dev, staging, prod)

#### GitOps & Deployments
- ArgoCD bootstrap configuration with App of Apps pattern
- ApplicationSets for automatic team app generation
- Helm base-app chart for standardized deployments

#### Multi-Tenancy
- Tenant Custom Resource Definition (CRD)
- Resource quota tiers (starter, standard, enterprise)
- Namespace provisioning per environment

#### Service Catalog
- PostgreSQL managed service (CloudNativePG)
- Redis managed service (Redis Operator)
- RabbitMQ managed service (RabbitMQ Operator)

#### Self-Service Portal
- Backstage architecture and configuration
- Software templates for new applications
- Service catalog integration

#### Workflow Automation
- n8n deployment for workflow automation
- Production deployment approval workflows
- Team onboarding automation
- Critical alert handling with PagerDuty integration
- Event-driven architecture with webhooks and schedules

#### Security
- OPA Gatekeeper policies for compliance
- Network policies for pod isolation
- RBAC configuration for platform roles
- TLS automation with cert-manager
- Secret detection with Gitleaks
- Container image scanning with Trivy

#### Observability
- Prometheus for metrics collection
- Grafana dashboards
- Alertmanager for alerting

#### Networking
- NetBird VPN integration
- AdGuard DNS filtering

#### CI/CD
- GitHub Actions workflows for Terraform
- Helm chart linting and validation
- Security scanning pipelines
- Release automation with Release Please

#### Documentation
- Getting started guide
- Architecture documentation
- Customization guide
- Operational runbooks
- ADR (Architecture Decision Records)
- Security policy (SECURITY.md)
- Contributing guidelines

#### Repository Configuration
- CODEOWNERS for review requirements
- Dependabot for dependency updates
- Pre-commit hooks for code quality
- Branch protection setup script

[Unreleased]: https://github.com/skyengpro/om/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/skyengpro/om/releases/tag/v0.0.0
