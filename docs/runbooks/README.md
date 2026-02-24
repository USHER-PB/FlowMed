# Platform Runbooks

Operational procedures for common platform tasks.

## Table of Contents

1. [Incident Response](#incident-response)
2. [Application Troubleshooting](#application-troubleshooting)
3. [Infrastructure Operations](#infrastructure-operations)
4. [Scaling Operations](#scaling-operations)
5. [Backup and Recovery](#backup-and-recovery)

## Incident Response

### High Error Rate Alert

**Symptoms**: `HighErrorRate` or `CriticalErrorRate` alert firing

**Diagnosis Steps**:

```bash
# 1. Check pod status
kubectl get pods -n <namespace> -l app=<app-name>

# 2. Check recent logs
kubectl logs -n <namespace> -l app=<app-name> --tail=100

# 3. Check pod events
kubectl describe pod -n <namespace> <pod-name>

# 4. Check resource usage
kubectl top pods -n <namespace>

# 5. Check recent deployments
kubectl rollout history deployment/<app-name> -n <namespace>
```

**Common Causes**:
- Recent deployment with bugs
- Dependency service down
- Resource exhaustion
- Configuration issues

**Resolution**:
```bash
# Rollback if recent deployment
kubectl rollout undo deployment/<app-name> -n <namespace>

# Scale up if load-related
kubectl scale deployment/<app-name> --replicas=<count> -n <namespace>
```

### Pod CrashLooping

**Symptoms**: `PodCrashLooping` alert firing

**Diagnosis Steps**:

```bash
# 1. Check pod status
kubectl get pods -n <namespace> -l app=<app-name>

# 2. Check crash logs
kubectl logs -n <namespace> <pod-name> --previous

# 3. Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# 4. Check resource limits
kubectl describe pod -n <namespace> <pod-name> | grep -A5 Limits
```

**Common Causes**:
- OOM (Out of Memory)
- Liveness probe failing
- Missing dependencies
- Configuration errors

### Node Not Ready

**Symptoms**: `NodeNotReady` alert firing

**Diagnosis Steps**:

```bash
# 1. Check node status
kubectl get nodes
kubectl describe node <node-name>

# 2. Check node conditions
kubectl get node <node-name> -o jsonpath='{.status.conditions[*]}' | jq

# 3. Check system pods
kubectl get pods -n kube-system -o wide | grep <node-name>
```

**Escalation**:
- Contact cloud provider if hardware issue
- Contact Platform team for cluster issues

## Application Troubleshooting

### Application Not Accessible

```bash
# 1. Check pod is running
kubectl get pods -n <namespace> -l app=<app-name>

# 2. Check service
kubectl get svc -n <namespace> <app-name>
kubectl describe svc -n <namespace> <app-name>

# 3. Check endpoints
kubectl get endpoints -n <namespace> <app-name>

# 4. Check ingress
kubectl get ingress -n <namespace>
kubectl describe ingress -n <namespace> <ingress-name>

# 5. Test internal connectivity
kubectl run test --rm -it --image=busybox -- wget -O- http://<service>.<namespace>

# 6. Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=100
```

### Slow Response Times

```bash
# 1. Check resource usage
kubectl top pods -n <namespace> -l app=<app-name>

# 2. Check HPA status
kubectl get hpa -n <namespace>

# 3. Check node resource pressure
kubectl describe nodes | grep -A5 "Conditions:"

# 4. Check for pending pods
kubectl get pods -n <namespace> --field-selector=status.phase=Pending

# 5. Check Prometheus metrics
# Query: application:http_request_duration_seconds:p95{app="<app-name>"}
```

### Deployment Stuck

```bash
# 1. Check rollout status
kubectl rollout status deployment/<app-name> -n <namespace>

# 2. Check replicaset
kubectl get rs -n <namespace> -l app=<app-name>

# 3. Check pod status
kubectl get pods -n <namespace> -l app=<app-name>

# 4. Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# 5. Force rollback if needed
kubectl rollout undo deployment/<app-name> -n <namespace>
```

## Infrastructure Operations

### Terraform Plan/Apply

```bash
# Navigate to environment
cd terraform/environments/<env>

# Initialize
terraform init

# Plan changes
terraform plan -out=tfplan

# Review plan carefully!

# Apply (requires approval)
terraform apply tfplan
```

### Add New Node Group

1. Update `terraform/environments/<env>/main.tf`:

```hcl
module "kubernetes" {
  # ...
  node_groups = {
    existing = { ... }
    new-group = {
      instance_types  = ["t3.large"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
      desired_size    = 2
      max_size        = 10
      min_size        = 1
      max_unavailable = 1
      labels = {
        workload = "new-workload"
      }
      taints = []
    }
  }
}
```

2. Apply Terraform:
```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### Rotate Secrets

```bash
# 1. Update secret in AWS Secrets Manager / Vault

# 2. Trigger External Secrets sync
kubectl annotate externalsecret <name> -n <namespace> \
  force-sync=$(date +%s) --overwrite

# 3. Restart pods to pick up new secrets
kubectl rollout restart deployment/<app-name> -n <namespace>
```

## Scaling Operations

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment/<app-name> -n <namespace> --replicas=<count>

# Verify
kubectl get pods -n <namespace> -l app=<app-name>
```

### Enable/Adjust HPA

```yaml
# In values.yaml
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### Cluster Scaling

```bash
# Check current node count
kubectl get nodes

# Update desired size in Terraform
# terraform/environments/<env>/main.tf

# Apply
cd terraform/environments/<env>
terraform plan -out=tfplan
terraform apply tfplan
```

## Backup and Recovery

### Database Backup

```bash
# Verify backup job ran
kubectl get jobs -n <namespace> | grep backup

# Check backup logs
kubectl logs -n <namespace> job/<backup-job-name>

# List backups in S3
aws s3 ls s3://<backup-bucket>/<app-name>/
```

### Restore from Backup

```bash
# 1. Scale down application
kubectl scale deployment/<app-name> -n <namespace> --replicas=0

# 2. Restore database (example for PostgreSQL)
kubectl exec -it -n <namespace> <db-pod> -- \
  pg_restore -d <database> /backup/latest.dump

# 3. Scale up application
kubectl scale deployment/<app-name> -n <namespace> --replicas=<count>

# 4. Verify application health
kubectl logs -n <namespace> -l app=<app-name> --tail=50
```

### ArgoCD Recovery

```bash
# Sync all applications
argocd app sync --all

# Force sync specific app
argocd app sync <app-name> --force

# Hard refresh (clear cache)
argocd app get <app-name> --hard-refresh
```

## Emergency Contacts

| Role | Contact |
|------|---------|
| Platform On-Call | platform-oncall@example.com |
| Security Team | security@example.com |
| Database Team | dba@example.com |

## Related Documentation

- [Architecture](../architecture/README.md)
- [Getting Started](../getting-started/README.md)
- [Customization](../customization/README.md)
