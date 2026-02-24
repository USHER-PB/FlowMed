# =============================================================================
# Development Environment Configuration
# =============================================================================
# This configuration deploys the platform infrastructure in the dev environment.
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  # Backend configuration - uncomment and configure for your environment
  # backend "s3" {
  #   bucket         = "om-terraform-state-dev"
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "om-terraform-locks"
  # }
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

provider "kubernetes" {
  host                   = module.kubernetes.cluster_endpoint
  cluster_ca_certificate = base64decode(module.kubernetes.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.kubernetes.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.kubernetes.cluster_endpoint
    cluster_ca_certificate = base64decode(module.kubernetes.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.kubernetes.cluster_name]
    }
  }
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  environment  = "dev"
  cluster_name = "${var.project_name}-${local.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = local.environment
    ManagedBy   = "terraform"
    Repository  = "github.com/skyengpro/om"
  }
}

# =============================================================================
# Networking
# =============================================================================

module "networking" {
  source = "../../modules/networking"

  name         = local.cluster_name
  vpc_cidr     = var.vpc_cidr
  cluster_name = local.cluster_name
  az_count     = var.az_count

  enable_nat_gateway = true
  single_nat_gateway = true  # Use single NAT in dev to save costs
  enable_flow_logs   = true
  enable_vpc_endpoints = true

  tags = local.common_tags
}

# =============================================================================
# Kubernetes Cluster
# =============================================================================

module "kubernetes" {
  source = "../../modules/kubernetes"

  cluster_name       = local.cluster_name
  kubernetes_version = var.kubernetes_version

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  endpoint_private_access = true
  endpoint_public_access  = true

  node_groups = {
    general = {
      instance_types  = ["t3.medium"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 50
      desired_size    = 2
      max_size        = 4
      min_size        = 1
      max_unavailable = 1
      labels = {
        workload = "general"
      }
      taints = []
    }
  }

  # Addons
  enable_vpc_cni_addon    = true
  enable_coredns_addon    = true
  enable_kube_proxy_addon = true
  enable_ebs_csi_addon    = true

  tags = local.common_tags
}

# =============================================================================
# Platform Components (Helm Releases)
# =============================================================================

# ArgoCD - GitOps Controller
resource "helm_release" "argocd" {
  count = var.enable_argocd ? 1 : 0

  name             = "argocd"
  namespace        = "argocd"
  create_namespace = true
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.argocd_version

  values = [
    file("${path.module}/values/argocd.yaml")
  ]

  depends_on = [module.kubernetes]
}

# Cert-Manager - Certificate Management
resource "helm_release" "cert_manager" {
  count = var.enable_cert_manager ? 1 : 0

  name             = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = var.cert_manager_version

  set {
    name  = "installCRDs"
    value = "true"
  }

  depends_on = [module.kubernetes]
}

# Prometheus Stack - Monitoring
resource "helm_release" "prometheus_stack" {
  count = var.enable_monitoring ? 1 : 0

  name             = "prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = var.prometheus_stack_version

  values = [
    file("${path.module}/values/prometheus-stack.yaml")
  ]

  depends_on = [module.kubernetes]
}
