# Contributing to OM Platform

Thank you for your interest in contributing to the OM Platform! This document provides guidelines for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Documentation](#documentation)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## Getting Started

### Prerequisites

- Git
- Terraform >= 1.6
- kubectl >= 1.28
- Helm >= 3.12
- Pre-commit hooks

### Setup

```bash
# Clone the repository
git clone https://github.com/skyengpro/om.git
cd om

# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Verify setup
pre-commit run --all-files
```

## How to Contribute

### Reporting Bugs

1. Search existing issues first
2. Use the bug report template
3. Include reproduction steps
4. Attach relevant logs

### Suggesting Features

1. Check the roadmap and existing issues
2. Use the feature request template
3. Explain the use case
4. Consider implementation approach

### Contributing Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Development Workflow

### Branch Naming

```
feature/short-description
fix/issue-number-description
docs/what-changed
refactor/what-changed
```

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(helm): add support for custom annotations
fix(terraform): correct security group rules
docs(getting-started): add troubleshooting section
```

### Pull Request Process

1. Update documentation if needed
2. Add/update tests
3. Ensure CI passes
4. Get at least one review
5. Squash and merge

## Coding Standards

### Terraform

```hcl
# Use consistent formatting
terraform fmt -recursive

# Validate configurations
terraform validate

# Follow naming conventions
resource "aws_instance" "web_server" {  # snake_case
  # ...
}

# Document variables
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

# Use locals for computed values
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
```

### Helm Charts

```yaml
# Use consistent indentation (2 spaces)
# Quote strings that could be interpreted as other types
image:
  repository: "nginx"
  tag: "1.25"

# Document values with comments
# -- Number of replicas
replicaCount: 1

# Use helpers for repeated content
{{ include "mychart.labels" . | nindent 4 }}
```

### YAML/Kubernetes

```yaml
# Use consistent indentation (2 spaces)
# Include appropriate labels
metadata:
  labels:
    app.kubernetes.io/name: myapp
    app.kubernetes.io/part-of: om-platform

# Document with comments
# This deployment runs the main application
apiVersion: apps/v1
kind: Deployment
```

## Testing

### Terraform

```bash
# Format check
terraform fmt -check -recursive

# Validation
cd terraform/environments/dev
terraform init -backend=false
terraform validate

# Security scan
tfsec terraform/
```

### Helm

```bash
# Lint charts
helm lint helm/charts/*

# Template validation
helm template test helm/charts/base-app

# Unit tests (if using helm-unittest)
helm unittest helm/charts/base-app
```

### OPA Policies

```bash
# Check syntax
opa check security/opa-policies/

# Run tests
opa test security/opa-policies/ -v
```

## Documentation

### When to Update Docs

- Adding new features
- Changing configuration options
- Modifying architecture
- Fixing bugs with user impact

### Documentation Structure

```
docs/
├── getting-started/    # Onboarding guides
├── architecture/       # Design documents
├── customization/      # How-to guides
├── runbooks/          # Operational procedures
└── adr/               # Architecture decisions
```

### Writing Style

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Keep it up to date

## Questions?

- Open a GitHub issue
- Join #platform-support on Slack
- Email platform@example.com

Thank you for contributing!
