# Implementation Plan: Fineract Deployment Helm Charts

## Overview

This implementation plan creates two Helm charts for deploying Apache Fineract on Kubernetes:
- **fineract-core** (Wave 4): Core banking engine with 6 components
- **fineract-ui-stack** (Wave 7): UI applications with 10 frontend apps

The implementation adapts patterns from the existing `base-app` chart and follows Kubernetes best practices for production deployments.

## Tasks

### Wave 7: Fineract UI Stack (Current Branch: feat/wave-7-deploy-fineract-ui-stack-portal-web-admin-self-service-accounting-branch-cashier-asset-apps)

- [x] 1. Set up fineract-core chart structure
  - Create `helm/charts/fineract-core/` directory
  - Create Chart.yaml with metadata (name, version, description, maintainers, keywords)
  - Create values.yaml with global configuration structure
  - Create templates directory with _helpers.tpl
  - Create README.md with chart overview
  - _Requirements: 1.1, 11.1, 11.2, 11.3, 15.1_

- [x] 2. Implement Fineract Read instance deployment
  - [x] 2.1 Create Fineract Read deployment template
  - [x] 2.2 Create Fineract Read service template

- [x] 3. Implement Fineract Write instance deployment
  - [x] 3.1 Create Fineract Write deployment template
  - [x] 3.2 Create Fineract Write service template

- [x] 4. Implement Fineract Batch instance deployment
  - [x] 4.1 Create Fineract Batch deployment template
  - [x] 4.2 Create Fineract Batch service template

- [x] 5. Implement NGINX Gateway with routing logic
  - [x] 5.1 Create NGINX Gateway ConfigMap template
  - [x] 5.2 Create NGINX Gateway deployment template
  - [x] 5.3 Create NGINX Gateway service template
  - [x] 5.4 Create NGINX Gateway Ingress template

- [x] 6. Implement OAuth2-Proxy for authentication
  - [x] 6.1 Create OAuth2-Proxy deployment template
  - [x] 6.2 Create OAuth2-Proxy service template
  - [x] 6.3 Create OAuth2-Proxy secret template

- [x] 7. Implement User Sync Service
  - [x] 7.1 Create User Sync deployment template
  - [x] 7.2 Create User Sync service template
  - [x] 7.3 Create User Sync secret template

- [x] 8. Implement Config CLI bootstrap job
  - [x] 8.1 Create Config CLI ConfigMap template
  - [x] 8.2 Create Config CLI Job template
  - [x] 8.3 Create Config CLI secret template

- [x] 9. Create fineract-core secrets and service account
  - [x] 9.1 Create database secret template
  - [x] 9.2 Create service account template

- [-] 10. Complete fineract-core values.yaml
  - Add global section (domain, environment)
  - Add fineract section (image, read/write/batch configs with replicas, resources, autoscaling)
  - Add database section (host, port, name, username, connectionPool settings)
  - Add redis section (host, port, database)
  - Add gateway section (image, replicas, resources, ingress config with hostname and TLS)
  - Add oauth2Proxy section (image, replicas, resources, keycloak config, redirectUrl)
  - Add userSync section (image, replicas, resources, syncIntervalSeconds)
  - Add configCli section (image, resources, bootstrapData)
  - Add secrets section (database.password, keycloak.clientSecret, oauth2Proxy.cookieSecret, fineractApi credentials)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.7_
  - **Status: Needs to be done on wave-4 branch**

- [ ] 11. Create fineract-core README documentation
  - Document chart purpose and architecture overview
  - List prerequisites (PostgreSQL, Redis, Keycloak from previous waves)
  - Document installation commands (helm install with values)
  - Document all values.yaml configuration options in tables
  - Add examples for dev, staging, and prod configurations
  - Document secret management and recommend external-secrets-operator for production
  - Add troubleshooting section for common issues
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 14.6_
  - **Status: Needs to be done on wave-4 branch**

- [ ] 12. Checkpoint - Validate fineract-core chart
  - Run `helm lint helm/charts/fineract-core` and fix any warnings
  - Run `helm template helm/charts/fineract-core` to verify templates render
  - Validate generated manifests with `kubectl --dry-run=client`
  - Ensure all tests pass, ask the user if questions arise.
  - **Status: Needs to be done on wave-4 branch**

- [x] 13. Set up fineract-ui-stack chart structure
  - Create `helm/charts/fineract-ui-stack/` directory
  - Create Chart.yaml with metadata
  - Create values.yaml with global configuration structure
  - Create templates directory with _helpers.tpl
  - Create README.md with chart overview

- [x] 14. Implement Portal UI application
  - [x] 14.1 Create Portal deployment template
  - [x] 14.2 Create Portal ConfigMap template
  - [x] 14.3 Create Portal service template
  - [x] 14.4 Create Portal Ingress template

- [ ] 15. Implement Web App UI application (OPTIONAL)
  - [ ] 15.1 Create Web App deployment template
  - [ ] 15.2 Create Web App ConfigMap template
  - [ ] 15.3 Create Web App service template
  - [ ] 15.4 Create Web App Ingress template
  - **Status: Optional - can be done on current branch**

- [x] 16. Implement Admin UI application
  - [x] 16.1 Create Admin deployment template
  - [x] 16.2 Create Admin ConfigMap template
  - [x] 16.3 Create Admin service template
  - [x] 16.4 Create Admin Ingress template

- [ ] 17. Implement Self-Service UI application (OPTIONAL)
  - [ ] 17.1 Create Self-Service deployment template
  - [ ] 17.2 Create Self-Service ConfigMap template
  - [ ] 17.3 Create Self-Service service template
  - [ ] 17.4 Create Self-Service Ingress template
  - **Status: Optional - can be done on current branch**

- [x] 18. Implement Account Management UI application
  - [x] 18.1 Create Account Management deployment template
  - [x] 18.2 Create Account Management ConfigMap template
  - [x] 18.3 Create Account Management service template
  - [x] 18.4 Create Account Management Ingress template

- [x] 19. Implement Accounting UI application
  - [x] 19.1 Create Accounting deployment template
  - [x] 19.2 Create Accounting ConfigMap template
  - [x] 19.3 Create Accounting service template
  - [x] 19.4 Create Accounting Ingress template

- [x] 20. Implement Reporting UI application
  - [x] 20.1 Create Reporting deployment template
  - [x] 20.2 Create Reporting ConfigMap template
  - [x] 20.3 Create Reporting service template
  - [x] 20.4 Create Reporting Ingress template

- [x] 21. Implement Branch UI application
  - [x] 21.1 Create Branch deployment template
  - [x] 21.2 Create Branch ConfigMap template
  - [x] 21.3 Create Branch service template
  - [x] 21.4 Create Branch Ingress template

- [x] 22. Implement Cashier UI application
  - [x] 22.1 Create Cashier deployment template
  - [x] 22.2 Create Cashier ConfigMap template
  - [x] 22.3 Create Cashier service template
  - [x] 22.4 Create Cashier Ingress template

- [ ] 23. Implement Asset UI application
  - [ ] 23.1 Create Asset deployment template
    - Create `templates/asset/deployment.yaml`
    - Use asset-ui image from values with nginx base
    - Configure container, probes, resources, and ConfigMap mount
    - _Requirements: 7.2, 7.5, 8.5, 12.6, 13.6_
  
  - [ ] 23.2 Create Asset ConfigMap template
    - Create `templates/asset/configmap.yaml`
    - Define config.json with API endpoint and Keycloak configuration
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_
  
  - [ ] 23.3 Create Asset service template
    - Create `templates/asset/service.yaml`
    - Expose port 80 as ClusterIP service
    - _Requirements: 7.3_
  
  - [ ] 23.4 Create Asset Ingress template
    - Create `templates/asset/ingress.yaml`
    - Configure hostname, TLS, and cert-manager annotations
    - _Requirements: 7.4, 9.1, 9.2, 9.3, 9.4, 9.5_
  - **Status: Values exist in values.yaml, templates need to be created**

- [x] 24. Complete fineract-ui-stack values.yaml
  - Add global section (domain, apiEndpoint, keycloak config)
  - Add ui section with common configuration (image defaults, resources, replicaCount)
  - Add portal section (enabled, image, hostname, keycloak.clientId, tls)
  - Add webApp section (enabled, image, hostname, keycloak.clientId, tls)
  - Add admin section (enabled, image, hostname, keycloak.clientId, tls)
  - Add selfService section (enabled, image, hostname, keycloak.clientId, tls)
  - Add accountManagement section (enabled, image, hostname, keycloak.clientId, tls)
  - Add accounting section (enabled, image, hostname, keycloak.clientId, tls)
  - Add reporting section (enabled, image, hostname, keycloak.clientId, tls)
  - Add branch section (enabled, image, hostname, keycloak.clientId, tls)
  - Add cashier section (enabled, image, hostname, keycloak.clientId, tls)
  - Add asset section (enabled, image, hostname, keycloak.clientId, tls)
  - _Requirements: 10.6, 10.7, 10.8, 12.7_
  - **Status: COMPLETE - values.yaml has all sections including asset**

- [ ] 25. Create fineract-ui-stack README documentation
  - Document chart purpose and UI applications overview
  - List prerequisites (fineract-core from Wave 4, Keycloak from Wave 1)
  - Document installation commands (helm install with values)
  - Document all values.yaml configuration options in tables
  - Add examples for different environment configurations
  - Document how to enable/disable individual UI applications
  - Add troubleshooting section for common issues
  - _Requirements: 15.5, 15.6, 15.7_
  - **Status: README exists but may need completion**

- [ ] 26. Final checkpoint - Validate fineract-ui-stack chart
  - Run `helm lint helm/charts/fineract-ui-stack` and fix any warnings
  - Run `helm template helm/charts/fineract-ui-stack` to verify templates render
  - Validate generated manifests with `kubectl --dry-run=client`
  - Verify all UI applications have consistent structure
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- This is a planning workflow - implementation will be done separately by executing tasks
- All templates should follow Kubernetes best practices and the base-app chart patterns
- Resource limits and requests should be tuned based on actual workload requirements
- Secret management should use external-secrets-operator in production environments
- TLS certificates should be managed by cert-manager
- Health probes should be configured with appropriate timeouts for application startup
- Each UI application follows the same pattern for consistency and maintainability

## Current Status Summary

### On Current Branch (wave-7):
- **Task 23**: Asset UI templates need to be created (values already exist)
- **Task 24**: COMPLETE - values.yaml is complete
- **Task 25**: README exists, may need minor updates
- **Task 15**: Web App UI (Optional) - templates missing, values exist
- **Task 17**: Self-Service UI (Optional) - templates missing, values exist

### On wave-4 Branch:
- **Task 10**: fineract-core values.yaml needs completion
- **Task 11**: fineract-core README needs creation
- **Task 12**: fineract-core chart validation needed
