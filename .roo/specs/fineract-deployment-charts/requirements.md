# Requirements Document

## Introduction

This document defines the requirements for creating Helm charts to deploy the Apache Fineract core banking system and UI stack on Kubernetes. The deployment follows a wave-based architecture where Wave 4 deploys the core banking engine components and Wave 7 deploys the UI applications. The charts will be created in the `$HOME/Projects/om/helm/charts` directory and will adapt patterns from the existing `fineract-gitops` reference structure without modifying it.

## Glossary

- **Fineract_Core**: The Apache Fineract core banking engine consisting of Read, Write, and Batch instances
- **Fineract_Read**: Read-only Fineract instance for query operations
- **Fineract_Write**: Write Fineract instance for transaction operations
- **Fineract_Batch**: Batch processing Fineract instance for scheduled jobs
- **User_Sync_Service**: Service that synchronizes users between Keycloak and Fineract
- **NGINX_Gateway**: API gateway that routes traffic to Fineract instances
- **OAuth2_Proxy**: Token validation proxy for OIDC authentication
- **Fineract_Config_CLI**: Command-line tool for bootstrapping Fineract configuration
- **UI_Stack**: Collection of 10 frontend applications for Fineract
- **Wave_4**: Deployment phase for Fineract core banking engine
- **Wave_7**: Deployment phase for Fineract UI applications
- **Base_App_Chart**: Existing standardized Helm chart template in the workspace
- **Fineract_GitOps_Reference**: Reference chart structure at $HOME/Projects/fineract-gitops
- **PostgreSQL_Primary**: PostgreSQL database from Wave 0
- **Redis**: Redis cache from Wave 2
- **Keycloak**: Identity provider from Wave 1
- **Helm_Charts_Directory**: Target directory at $HOME/Projects/om/helm/charts
- **Chart_Package**: A Helm chart with Chart.yaml, templates directory, and values.yaml

## Requirements

### Requirement 1: Wave 4 Fineract Core Chart Structure

**User Story:** As a DevOps engineer, I want a Helm chart for Wave 4 Fineract core components, so that I can deploy the banking engine with all required services.

#### Acceptance Criteria

1. THE Helm_Charts_Directory SHALL contain a chart named "fineract-core" with Chart.yaml, templates directory, and values.yaml
2. THE Fineract_Core chart SHALL include templates for Fineract_Read, Fineract_Write, and Fineract_Batch deployments
3. THE Fineract_Core chart SHALL include a template for User_Sync_Service deployment
4. THE Fineract_Core chart SHALL include a template for NGINX_Gateway deployment with Ingress
5. THE Fineract_Core chart SHALL include a template for OAuth2_Proxy deployment
6. THE Fineract_Core chart SHALL include a Job template for Fineract_Config_CLI
7. THE Fineract_Core chart SHALL define Service resources for each deployment component
8. THE Fineract_Core chart SHALL use the Base_App_Chart patterns for deployment structure

### Requirement 2: Fineract Instance Configuration

**User Story:** As a platform engineer, I want Fineract instances configured with database and cache connections, so that they can operate correctly.

#### Acceptance Criteria

1. WHEN Fineract_Read is deployed, THE deployment SHALL include environment variables for PostgreSQL_Primary connection
2. WHEN Fineract_Write is deployed, THE deployment SHALL include environment variables for PostgreSQL_Primary connection
3. WHEN Fineract_Batch is deployed, THE deployment SHALL include environment variables for PostgreSQL_Primary connection
4. THE Fineract instances SHALL include environment variables for Redis connection configuration
5. THE Fineract instances SHALL include configurable database connection pool settings via values.yaml
6. THE Fineract instances SHALL reference database credentials from Kubernetes Secrets
7. THE Fineract instances SHALL include health check probes at /fineract-provider/actuator/health

### Requirement 3: User Sync Service Configuration

**User Story:** As a system administrator, I want User_Sync_Service configured to sync users between Keycloak and Fineract, so that authentication is integrated.

#### Acceptance Criteria

1. THE User_Sync_Service deployment SHALL include environment variables for Keycloak URL
2. THE User_Sync_Service deployment SHALL reference Keycloak credentials from Kubernetes Secrets
3. THE User_Sync_Service deployment SHALL include environment variables for Fineract API URL
4. THE User_Sync_Service deployment SHALL reference Fineract API credentials from Kubernetes Secrets
5. THE User_Sync_Service deployment SHALL include configurable sync interval via values.yaml

### Requirement 4: NGINX Gateway Routing

**User Story:** As an API consumer, I want NGINX_Gateway to route requests to appropriate Fineract instances, so that read and write operations are handled correctly.

#### Acceptance Criteria

1. THE NGINX_Gateway SHALL include an Ingress resource with routing rules
2. WHEN a request path matches read operations, THE NGINX_Gateway SHALL route to Fineract_Read service
3. WHEN a request path matches write operations, THE NGINX_Gateway SHALL route to Fineract_Write service
4. THE NGINX_Gateway SHALL include TLS configuration via cert-manager annotations
5. THE NGINX_Gateway SHALL include configurable hostname via values.yaml
6. THE NGINX_Gateway deployment SHALL include an nginx.conf ConfigMap with routing logic

### Requirement 5: OAuth2 Proxy Authentication

**User Story:** As a security engineer, I want OAuth2_Proxy to validate tokens from Keycloak, so that API access is authenticated.

#### Acceptance Criteria

1. THE OAuth2_Proxy deployment SHALL include environment variables for Keycloak OIDC provider URL
2. THE OAuth2_Proxy deployment SHALL reference OIDC client credentials from Kubernetes Secrets
3. THE OAuth2_Proxy deployment SHALL include cookie secret configuration from Kubernetes Secrets
4. THE OAuth2_Proxy deployment SHALL include session secret configuration from Kubernetes Secrets
5. THE OAuth2_Proxy deployment SHALL include configurable redirect URLs via values.yaml
6. THE OAuth2_Proxy SHALL be positioned between NGINX_Gateway and Fineract instances in the request flow

### Requirement 6: Fineract Configuration Bootstrap

**User Story:** As a system administrator, I want Fineract_Config_CLI to bootstrap initial configuration, so that the system is ready for use.

#### Acceptance Criteria

1. THE Fineract_Config_CLI Job SHALL mount a ConfigMap containing bootstrap configuration
2. THE Fineract_Config_CLI Job SHALL reference Fineract API credentials from Kubernetes Secrets
3. THE Fineract_Config_CLI Job SHALL include environment variables for Fineract API URL
4. THE Fineract_Config_CLI Job SHALL include configurable bootstrap data via values.yaml
5. THE Fineract_Config_CLI Job SHALL use restartPolicy OnFailure
6. THE Fineract_Config_CLI Job SHALL include resource limits via values.yaml

### Requirement 7: Wave 7 UI Stack Chart Structure

**User Story:** As a DevOps engineer, I want a Helm chart for Wave 7 UI applications, so that I can deploy all frontend interfaces.

#### Acceptance Criteria

1. THE Helm_Charts_Directory SHALL contain a chart named "fineract-ui-stack" with Chart.yaml, templates directory, and values.yaml
2. THE UI_Stack chart SHALL include templates for Portal, Web App, Admin, Self-Service, Account Management, Accounting, Reporting, Branch, Cashier, and Asset UI applications
3. THE UI_Stack chart SHALL use the Base_App_Chart patterns for deployment structure
4. THE UI_Stack chart SHALL allow individual applications to be enabled/disabled via values.yaml
5. THE UI_Stack chart SHALL define Service resources for each UI application

### Requirement 8: UI Application Configuration

**User Story:** As a frontend developer, I want UI applications configured with API endpoints and authentication, so that they can connect to backend services.

#### Acceptance Criteria

1. THE UI applications SHALL include ConfigMap with API endpoint configuration
2. THE UI applications SHALL include Keycloak OIDC configuration in ConfigMap
3. THE UI applications SHALL include configurable Keycloak client ID via values.yaml
4. THE UI applications SHALL include configurable redirect URI via values.yaml
5. THE UI applications SHALL mount ConfigMap as configuration file
6. THE UI applications SHALL use nginx base image for static file serving

### Requirement 9: UI Stack Ingress Configuration

**User Story:** As a platform engineer, I want UI applications exposed via Ingress with TLS, so that they are securely accessible.

#### Acceptance Criteria

1. THE UI applications SHALL include Ingress resources with configurable hostnames
2. THE UI applications SHALL include TLS configuration via cert-manager annotations
3. THE UI applications SHALL include configurable TLS secret names via values.yaml
4. THE UI applications SHALL use nginx IngressClass
5. THE UI applications SHALL include per-application hostname configuration

### Requirement 10: Values Configuration

**User Story:** As a DevOps engineer, I want comprehensive values.yaml files for both charts, so that I can customize deployments.

#### Acceptance Criteria

1. THE fineract-core values.yaml SHALL include global configuration section
2. THE fineract-core values.yaml SHALL include fineract instance configuration with replicas and resources
3. THE fineract-core values.yaml SHALL include database connection configuration
4. THE fineract-core values.yaml SHALL include redis connection configuration
5. THE fineract-core values.yaml SHALL include gateway configuration with ingress settings
6. THE fineract-ui-stack values.yaml SHALL include global configuration section
7. THE fineract-ui-stack values.yaml SHALL include common UI configuration
8. THE fineract-ui-stack values.yaml SHALL include per-application configuration sections

### Requirement 11: Chart Metadata

**User Story:** As a Helm user, I want proper chart metadata, so that I can understand and manage the charts.

#### Acceptance Criteria

1. THE fineract-core Chart.yaml SHALL include name, version, description, and maintainers
2. THE fineract-core Chart.yaml SHALL include keywords for discoverability
3. THE fineract-core Chart.yaml SHALL include dependencies if any
4. THE fineract-ui-stack Chart.yaml SHALL include name, version, description, and maintainers
5. THE fineract-ui-stack Chart.yaml SHALL include keywords for discoverability
6. THE fineract-ui-stack Chart.yaml SHALL include dependencies if any

### Requirement 12: Resource Management

**User Story:** As a platform engineer, I want configurable resource requests and limits, so that I can manage cluster resources effectively.

#### Acceptance Criteria

1. THE Fineract_Read deployment SHALL include configurable CPU and memory resources
2. THE Fineract_Write deployment SHALL include configurable CPU and memory resources
3. THE Fineract_Batch deployment SHALL include configurable CPU and memory resources
4. THE NGINX_Gateway deployment SHALL include configurable CPU and memory resources
5. THE OAuth2_Proxy deployment SHALL include configurable CPU and memory resources
6. THE User_Sync_Service deployment SHALL include configurable CPU and memory resources
7. THE UI applications SHALL include configurable CPU and memory resources

### Requirement 13: Health Monitoring

**User Story:** As a site reliability engineer, I want health probes configured, so that Kubernetes can manage application health.

#### Acceptance Criteria

1. THE Fineract_Read deployment SHALL include liveness, readiness, and startup probes
2. THE Fineract_Write deployment SHALL include liveness, readiness, and startup probes
3. THE Fineract_Batch deployment SHALL include liveness, readiness, and startup probes
4. THE NGINX_Gateway deployment SHALL include liveness and readiness probes
5. THE OAuth2_Proxy deployment SHALL include liveness and readiness probes
6. THE User_Sync_Service deployment SHALL include liveness and readiness probes

### Requirement 14: Secret Management

**User Story:** As a security engineer, I want secrets properly managed, so that sensitive data is protected.

#### Acceptance Criteria

1. THE Fineract_Core chart SHALL define Secret for database credentials
2. THE User_Sync_Service deployment SHALL reference Secret for Keycloak credentials
3. THE OAuth2_Proxy deployment SHALL reference Secret for client credentials
4. THE Fineract_Config_CLI Job SHALL reference Secret for API credentials
5. THE secrets SHALL use base64 encoding for data values
6. THE documentation SHALL recommend external-secrets-operator for production

### Requirement 15: Documentation

**User Story:** As a new team member, I want comprehensive documentation, so that I can understand and use the charts.

#### Acceptance Criteria

1. THE fineract-core chart SHALL include README.md with overview and installation instructions
2. THE fineract-core chart SHALL include README.md with all configuration options documented
3. THE fineract-core chart SHALL include README.md with examples for different environments
4. THE fineract-core chart SHALL include README.md with troubleshooting section
5. THE fineract-ui-stack chart SHALL include README.md with overview and installation instructions
6. THE fineract-ui-stack chart SHALL include README.md with all configuration options documented
7. THE fineract-ui-stack chart SHALL include README.md with examples for different environments
