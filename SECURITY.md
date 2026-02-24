# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

We take the security of the OM Platform seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Do

1. **Email**: Send details to security@example.com (replace with your security email)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

## Security Best Practices

### For Platform Operators

1. **Secrets Management**
   - Never commit secrets to the repository
   - Use Kubernetes Secrets or external secret managers (Vault, AWS Secrets Manager)
   - Rotate credentials regularly

2. **Access Control**
   - Follow principle of least privilege
   - Use RBAC for Kubernetes access
   - Enable MFA for all accounts

3. **Network Security**
   - Use network policies to restrict pod communication
   - Enable TLS for all external communications
   - Use NetBird VPN for administrative access

4. **Monitoring & Auditing**
   - Enable audit logging in Kubernetes
   - Monitor Wazuh alerts
   - Review access logs regularly

### For Development Teams

1. **Container Security**
   - Use minimal base images
   - Scan images for vulnerabilities
   - Don't run containers as root

2. **Dependency Management**
   - Keep dependencies updated
   - Use Dependabot for automated updates
   - Review security advisories

3. **Code Security**
   - Follow secure coding practices
   - Use static analysis tools
   - Conduct code reviews

## Security Controls

### Implemented

| Control | Implementation |
|---------|---------------|
| Policy Enforcement | OPA Gatekeeper |
| Network Isolation | Kubernetes Network Policies |
| TLS Management | cert-manager |
| SIEM | Wazuh |
| VPN | NetBird |
| DNS Filtering | AdGuard |
| Vulnerability Scanning | Trivy (CI/CD) |
| Secret Detection | Gitleaks (CI/CD) |

### Branch Protection (Requires GitHub Pro)

When enabled, the following protections should be applied to `main`:

- Require pull request reviews (minimum 1)
- Require status checks to pass
- Require signed commits
- Require linear history
- Restrict who can push to matching branches
- Do not allow force pushes
- Do not allow deletions

## Compliance

The platform is designed to support:

- SOC 2 Type II
- ISO 27001
- PCI DSS (with additional configuration)
- HIPAA (with additional configuration)

## Security Contacts

- **Security Team**: security@skyengpro.com
- **On-Call**: PagerDuty (platform-security)
- **Slack**: #platform-security
