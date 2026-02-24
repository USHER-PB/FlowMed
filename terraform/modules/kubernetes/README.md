# Kubernetes Module

This module provisions a managed Kubernetes cluster (AWS EKS) with configurable node pools, networking, and addons.

## Features

- EKS cluster with configurable Kubernetes version
- Multiple node groups with autoscaling
- Secrets encryption with KMS
- OIDC provider for IAM Roles for Service Accounts (IRSA)
- Managed addons (VPC CNI, CoreDNS, kube-proxy, EBS CSI)
- Cluster logging to CloudWatch

## Usage

```hcl
module "kubernetes" {
  source = "../../modules/kubernetes"

  cluster_name       = "my-cluster"
  kubernetes_version = "1.29"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  node_groups = {
    general = {
      instance_types  = ["t3.large"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
      desired_size    = 3
      max_size        = 6
      min_size        = 2
      max_unavailable = 1
      labels = {
        workload = "general"
      }
      taints = []
    }
    spot = {
      instance_types  = ["t3.large", "t3.xlarge"]
      capacity_type   = "SPOT"
      disk_size       = 50
      desired_size    = 2
      max_size        = 10
      min_size        = 0
      max_unavailable = 1
      labels = {
        workload = "spot"
      }
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  tags = {
    Environment = "production"
    Project     = "platform"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.6.0 |
| aws | ~> 5.0 |
| kubernetes | ~> 2.24 |
| helm | ~> 2.12 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| cluster_name | Name of the EKS cluster | string | - | yes |
| kubernetes_version | Kubernetes version | string | "1.29" | no |
| vpc_id | VPC ID | string | - | yes |
| subnet_ids | List of subnet IDs | list(string) | - | yes |
| node_groups | Map of node group configurations | map(object) | see variables.tf | no |
| endpoint_private_access | Enable private API endpoint | bool | true | no |
| endpoint_public_access | Enable public API endpoint | bool | true | no |
| tags | Tags for all resources | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | EKS cluster ID |
| cluster_name | EKS cluster name |
| cluster_endpoint | API server endpoint |
| cluster_certificate_authority_data | CA certificate |
| oidc_provider_arn | OIDC provider ARN for IRSA |
| node_groups | Map of node group attributes |

## IRSA (IAM Roles for Service Accounts)

This module creates an OIDC provider that enables IRSA. To create a role for a service account:

```hcl
resource "aws_iam_role" "my_app" {
  name = "my-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = module.kubernetes.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${replace(module.kubernetes.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:my-namespace:my-sa"
        }
      }
    }]
  })
}
```
