# =============================================================================
# Development Environment Variables
# =============================================================================

# =============================================================================
# General Configuration
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "om-platform"
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# Networking Configuration
# =============================================================================

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

# =============================================================================
# Kubernetes Configuration
# =============================================================================

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

# =============================================================================
# Platform Components
# =============================================================================

variable "enable_argocd" {
  description = "Enable ArgoCD installation"
  type        = bool
  default     = true
}

variable "argocd_version" {
  description = "ArgoCD Helm chart version"
  type        = string
  default     = "5.51.6"
}

variable "enable_cert_manager" {
  description = "Enable cert-manager installation"
  type        = bool
  default     = true
}

variable "cert_manager_version" {
  description = "cert-manager Helm chart version"
  type        = string
  default     = "1.13.3"
}

variable "enable_monitoring" {
  description = "Enable Prometheus stack installation"
  type        = bool
  default     = true
}

variable "prometheus_stack_version" {
  description = "kube-prometheus-stack Helm chart version"
  type        = string
  default     = "55.5.0"
}
