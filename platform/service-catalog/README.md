# Service Catalog

The Service Catalog provides pre-approved, self-service infrastructure components that teams can provision for their applications.

## Available Services

| Service | Description | Sizes | Managed By |
|---------|-------------|-------|------------|
| PostgreSQL | Relational database | small, medium, large | CloudNativePG |
| Redis | In-memory cache/store | small, medium, large | Redis Operator |
| RabbitMQ | Message queue | small, medium, large | RabbitMQ Operator |
| MongoDB | Document database | small, medium, large | MongoDB Operator |
| Elasticsearch | Search engine | small, medium, large | ECK Operator |
| Kafka | Event streaming | medium, large | Strimzi |

## How to Request a Service

### Option 1: Via Tenant CR

Add services to your Tenant specification:

```yaml
apiVersion: platform.om.io/v1alpha1
kind: Tenant
metadata:
  name: my-team
spec:
  # ... other fields ...
  services:
    - name: postgresql
      size: medium
    - name: redis
      size: small
```

### Option 2: Via Service Request CR

Create a ServiceRequest:

```yaml
apiVersion: platform.om.io/v1alpha1
kind: ServiceRequest
metadata:
  name: my-database
  namespace: my-team-dev
spec:
  service: postgresql
  size: medium
  config:
    version: "15"
    storage: 50Gi
```

### Option 3: Via Self-Service Portal

1. Navigate to the Developer Portal
2. Go to "Create" → "Service"
3. Select service type and configuration
4. Submit request (auto-approved for dev, requires approval for prod)

## Service Sizes

### Small
- **Use case**: Development, testing
- **Resources**: 0.5 CPU, 1Gi RAM
- **Storage**: 10Gi
- **HA**: No

### Medium
- **Use case**: Staging, low-traffic production
- **Resources**: 2 CPU, 4Gi RAM
- **Storage**: 50Gi
- **HA**: Optional

### Large
- **Use case**: Production, high-traffic
- **Resources**: 4 CPU, 16Gi RAM
- **Storage**: 200Gi
- **HA**: Yes (multi-replica)

## Service Templates

Each service is defined by a template in `offerings/`. Teams can request instances which are provisioned using these templates.
