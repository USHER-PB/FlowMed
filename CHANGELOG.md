# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- n8n workflow automation for approvals, onboarding, and alerting
- Event-driven architecture with webhook handlers and scheduled triggers
- ArgoCD notification handlers for deployment events
- SECURITY.md with security policies and guidelines
- CODEOWNERS for automated review assignments
- Dependabot configuration for automated dependency updates
- Pre-commit hooks for security and quality checks
- Branch protection setup script

### Changed

- Updated README with n8n architecture diagram
- Added Event-Driven Architecture diagram to documentation
- Enhanced technology stack documentation

## [0.2.0] - 2024-XX-XX

### Added

- Backstage self-service portal architecture
- Software templates for new applications
- Service catalog integration
- Team onboarding templates

### Changed

- Updated README with multi-tenant architecture
- Enhanced project structure documentation

## [0.1.0] - 2024-XX-XX

### Added

- Initial project structure
- Terraform modules for EKS and networking
- ArgoCD bootstrap configuration with App of Apps pattern
- Helm base-app chart for standardized deployments
- Multi-tenant support with Tenant CRD
- Resource quota tiers (starter, standard, enterprise)
- Service catalog with PostgreSQL, Redis, RabbitMQ offerings
- OPA Gatekeeper policies for security compliance
- Network policies for pod isolation
- RBAC configuration for platform roles
- Prometheus, Grafana, Alertmanager monitoring stack
- GitHub Actions CI/CD pipelines
- Comprehensive documentation

### Security

- TLS automation with cert-manager
- Secret detection in CI/CD
- Container image scanning with Trivy
- Network isolation with Network Policies
- NetBird VPN integration
- AdGuard DNS filtering

[Unreleased]: https://github.com/skyengpro/om/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/skyengpro/om/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/skyengpro/om/releases/tag/v0.1.0
