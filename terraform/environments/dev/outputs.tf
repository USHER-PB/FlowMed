# =============================================================================
# Development Environment Outputs
# =============================================================================

# =============================================================================
# Networking Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.networking.vpc_cidr
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

# =============================================================================
# Kubernetes Outputs
# =============================================================================

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.kubernetes.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.kubernetes.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "EKS cluster CA certificate"
  value       = module.kubernetes.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA"
  value       = module.kubernetes.oidc_provider_arn
}

# =============================================================================
# Kubeconfig Command
# =============================================================================

output "kubeconfig_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.kubernetes.cluster_name}"
}

# =============================================================================
# ArgoCD Access
# =============================================================================

output "argocd_server" {
  description = "ArgoCD server URL (after port-forward or ingress setup)"
  value       = var.enable_argocd ? "kubectl port-forward svc/argocd-server -n argocd 8080:443" : "ArgoCD not enabled"
}

output "argocd_admin_password_command" {
  description = "Command to get ArgoCD admin password"
  value       = var.enable_argocd ? "kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d" : "ArgoCD not enabled"
}

# =============================================================================
# Monitoring Access
# =============================================================================

output "grafana_access" {
  description = "Command to access Grafana"
  value       = var.enable_monitoring ? "kubectl port-forward svc/prometheus-stack-grafana -n monitoring 3000:80" : "Monitoring not enabled"
}

output "prometheus_access" {
  description = "Command to access Prometheus"
  value       = var.enable_monitoring ? "kubectl port-forward svc/prometheus-stack-kube-prom-prometheus -n monitoring 9090:9090" : "Monitoring not enabled"
}
