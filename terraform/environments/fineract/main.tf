 terraform {
  required_version = ">= 1.6.0"

  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

locals {
  repo_root  = abspath("${path.module}/../../..")
  charts_dir = "${local.repo_root}/helm/charts"
  values_dir = "${path.module}/values"

  sealed_secret_defaults = {
    asset_service_credentials         = "${local.repo_root}/configs/secrets/asset-service-credentials.yaml"
    customer_self_service_credentials = "${local.repo_root}/configs/secrets/customer-self-service-credentials.yaml"
    data_store_minio                  = "${local.repo_root}/configs/secrets/data-store-minio-sealed.yaml"
    data_store_postgres               = "${local.repo_root}/configs/secrets/data-store-postgres-sealed.yaml"
    db_admin_credentials              = "${local.repo_root}/configs/secrets/db-admin-credentials.yaml"
    fineract_config_credentials       = "${local.repo_root}/configs/secrets/fineract-config-credentials.yaml"
    ghcr_credentials                  = "${local.repo_root}/configs/secrets/ghcr-credentials.yaml"
    infra_cache_redis_auth            = "${local.repo_root}/configs/secrets/infra-cache-redis-auth.yaml"
    keycloak_keybound                 = "${local.repo_root}/configs/secrets/keycloak-keybound.yaml"
    keycloak_keycloak                 = "${local.repo_root}/configs/secrets/keycloak-admin.yaml"
    keycloak_postgres                 = "${local.repo_root}/configs/secrets/keycloak-postgres.yaml"
    keycloak_realm_credentials        = "${local.repo_root}/configs/secrets/keycloak-realm-credentials.yaml"
    kyc_manager_credentials           = "${local.repo_root}/configs/secrets/kyc-manager-credentials.yaml"
    oauth2_proxy_secrets              = "${local.repo_root}/configs/secrets/oauth2-proxy-secrets.yaml"
    payment_gateway_credentials       = "${local.repo_root}/configs/secrets/payment-gateway-credentials.yaml"
    sms_gateway_credentials           = "${local.repo_root}/configs/secrets/sms-gateway-credentials.yaml"
    user_storage_credentials          = "${local.repo_root}/configs/secrets/user-storage-credentials.yaml"
    user_sync_credentials             = "${local.repo_root}/configs/secrets/user-sync-credentials.yaml"
  }

  sealed_secret_sources = length(var.sealed_secret_files) > 0 ? var.sealed_secret_files : local.sealed_secret_defaults

  sealed_secret_manifests = {
    for name, path in local.sealed_secret_sources :
    name => merge(
      yamldecode(file(path)),
      {
        metadata = {
          for key, value in try(yamldecode(file(path)).metadata, {}) :
          key => value
          if key != "creationTimestamp"
        }
        spec = merge(
          try(yamldecode(file(path)).spec, {}),
          {
            template = merge(
              try(yamldecode(file(path)).spec.template, {}),
              {
                metadata = {
                  for key, value in try(yamldecode(file(path)).spec.template.metadata, {}) :
                  key => value
                  if key != "creationTimestamp"
                }
              }
            )
          }
        )
      }
    )
  }

  sealed_secret_checksums = {
    for name, path in local.sealed_secret_sources :
    name => filesha256(path)
  }

  sealed_secret_bundle_checksum = sha256(join("", [
    for key in sort(keys(local.sealed_secret_checksums)) :
    local.sealed_secret_checksums[key]
  ]))

  oauth2_proxy_secret_checksum = filesha256("${local.repo_root}/configs/secrets/oauth2-proxy-secrets.yaml")
  keycloak_realm_checksum      = filesha256("${local.repo_root}/helm/charts/keycloak/files/realm-fineract.yaml")
  fineract_config_checksum     = filesha256("${local.repo_root}/helm/charts/fineract-core/files/config/prod/base-config.yml")
  gateway_config_checksum      = filesha256("${local.repo_root}/helm/charts/fineract-core/files/nginx/gateway.conf")
  asset_manager_nginx_checksum = filesha256("${local.repo_root}/helm/charts/fineract-ui-stack/files/asset-manager-default.conf")
  asset_service_checksum = sha256(join("", [
    filesha256("${local.repo_root}/helm/charts/asset-service/templates/deployment.yaml"),
    filesha256("${local.repo_root}/helm/charts/asset-service/values.yaml"),
  ]))
}

provider "kubernetes" {
  config_path    = var.kubeconfig_path != "" ? pathexpand(var.kubeconfig_path) : null
  config_context = var.kubeconfig_context != "" ? var.kubeconfig_context : null
}

provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig_path != "" ? pathexpand(var.kubeconfig_path) : null
    config_context = var.kubeconfig_context != "" ? var.kubeconfig_context : null
  }
}

data "kubernetes_service" "ingress_nginx_controller" {
  metadata {
    name      = "ingress-nginx-controller"
    namespace = "ingress-nginx"
  }

  depends_on = [module.ingress_nginx]
}

resource "kubernetes_namespace" "fineract" {
  metadata {
    name = var.fineract_namespace
  }
}

resource "terraform_data" "sealed_secret_apply" {
  input = local.sealed_secret_checksums

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      KUBECONFIG=${pathexpand(var.kubeconfig_path)} kubectl apply -f ${local.repo_root}/configs/secrets
    EOT
  }

  depends_on = [module.sealed_secrets, kubernetes_namespace.fineract]
}

resource "terraform_data" "metallb_crds_apply" {
  input = filesha256("${local.charts_dir}/metallb/charts/metallb-0.14.8.tgz")

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      TMPDIR="$(mktemp -d)"
      trap 'rm -rf "$TMPDIR"' EXIT
      tar -xzf ${local.charts_dir}/metallb/charts/metallb-0.14.8.tgz -C "$TMPDIR"
      KUBECONFIG=${pathexpand(var.kubeconfig_path)} helm template metallb-crds "$TMPDIR/metallb/charts/crds" --include-crds | kubectl apply -f -
    EOT
  }

  depends_on = [kubernetes_namespace.fineract]
}

module "sealed_secrets" {
  source = "../../modules/helm_release"

  name             = "sealed-secrets"
  namespace        = "kube-system"
  create_namespace = false
  chart            = "${local.charts_dir}/sealed-secrets"
  values_files     = ["${local.charts_dir}/sealed-secrets/values.yaml"]
  timeout_seconds  = var.release_timeout_seconds
}

module "metallb" {
  source = "../../modules/helm_release"

  name      = "metallb"
  namespace = "metallb-system"
  chart     = "${local.charts_dir}/metallb"
  values_files = [
    "${local.charts_dir}/metallb/values.yaml",
    "${local.values_dir}/metallb.yaml",
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    terraform_data.metallb_crds_apply,
    module.sealed_secrets,
  ]
}

module "longhorn" {
  source = "../../modules/helm_release"

  name            = "longhorn"
  namespace       = "longhorn-system"
  chart           = "${local.charts_dir}/longhorn"
  values_files    = ["${local.charts_dir}/longhorn/values.yaml"]
  timeout_seconds = var.release_timeout_seconds
  depends_on      = [module.metallb]
}

module "ingress_nginx" {
  source = "../../modules/helm_release"

  name            = "ingress-nginx"
  namespace       = "ingress-nginx"
  chart           = "${local.charts_dir}/ingress-nginx"
  values_files    = ["${local.charts_dir}/ingress-nginx/values.yaml"]
  timeout_seconds = var.release_timeout_seconds
  depends_on      = [module.metallb]
}

module "cnpg" {
  source = "../../modules/helm_release"

  name            = "cnpg"
  namespace       = "cnpg-system"
  repository      = "https://cloudnative-pg.github.io/charts"
  chart           = "cloudnative-pg"
  chart_version   = var.cnpg_chart_version
  timeout_seconds = var.release_timeout_seconds
  depends_on      = [module.sealed_secrets]
}

module "data_store" {
  source = "../../modules/helm_release"

  name      = "data-store"
  namespace = var.fineract_namespace
  chart     = "${local.charts_dir}/data-store"
  values_files = [
    "${local.charts_dir}/data-store/values.yaml",
    "${local.values_dir}/data-store.yaml",
  ]
  extra_values = [
    yamlencode({
      bootstrapChecksums = {
        sealedSecrets = local.sealed_secret_bundle_checksum
      }
    })
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.longhorn,
    module.cnpg,
    terraform_data.sealed_secret_apply,
  ]
}

module "infra_cache" {
  source = "../../modules/helm_release"

  name         = "infra-cache"
  namespace    = var.fineract_namespace
  chart        = "${local.charts_dir}/infra-cache"
  values_files = ["${local.charts_dir}/infra-cache/values.yaml"]
  extra_values = [
    yamlencode({
      bootstrapChecksums = {
        sealedSecrets = local.sealed_secret_bundle_checksum
      }
    })
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.longhorn,
    terraform_data.sealed_secret_apply,
  ]
}

module "keycloak" {
  source = "../../modules/helm_release"

  name      = "keycloak"
  namespace = var.fineract_namespace
  chart     = "${local.charts_dir}/keycloak"
  values_files = [
    "${local.charts_dir}/keycloak/values.yaml",
    "${local.values_dir}/keycloak.yaml",
  ]
  extra_values = [
    yamlencode({
      keycloakConfig = {
        reconcileChecksum = sha256(join("", [
          local.keycloak_realm_checksum,
          local.sealed_secret_bundle_checksum,
        ]))
      }
      bootstrapChecksums = {
        sealedSecrets = local.sealed_secret_bundle_checksum
      }
    })
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.data_store,
    terraform_data.sealed_secret_apply,
    module.ingress_nginx,
  ]
}

module "fineract_core" {
  source = "../../modules/helm_release"

  name      = "fineract-core"
  namespace = var.fineract_namespace
  chart     = "${local.charts_dir}/fineract-core"
  values_files = [
    "${local.charts_dir}/fineract-core/values.yaml",
    "${local.values_dir}/fineract-core.yaml",
  ]
  extra_values = [
    yamlencode({
      commonAnnotations = {
        "checksum/gateway-config" = local.gateway_config_checksum
      }
      oauth2Proxy = {
        annotations = {
          "checksum/oauth2-proxy-sealed-secret" = local.oauth2_proxy_secret_checksum
        }
      }
      fineractConfig = {
        reconcileChecksum = sha256(join("", [
          local.fineract_config_checksum,
          local.sealed_secret_bundle_checksum,
        ]))
      }
      bootstrapChecksums = {
        sealedSecrets = local.sealed_secret_bundle_checksum
      }
    })
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.data_store,
    module.infra_cache,
    module.keycloak,
    terraform_data.sealed_secret_apply,
    module.ingress_nginx,
  ]
}

module "fineract_app_services" {
  source = "../../modules/helm_release"

  name      = "fineract-app-services"
  namespace = var.fineract_namespace
  chart     = "${local.charts_dir}/fineract-app-services"
  values_files = [
    "${local.charts_dir}/fineract-app-services/values.yaml",
    "${local.values_dir}/fineract-app-services.yaml",
  ]
  extra_values = [
    yamlencode({
      assetService = {
        reconcileChecksum = local.asset_service_checksum
      }
      bootstrapChecksums = {
        sealedSecrets = local.sealed_secret_bundle_checksum
      }
    })
  ]
  replace         = true
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.data_store,
    module.infra_cache,
    module.keycloak,
    module.fineract_core,
    terraform_data.sealed_secret_apply,
  ]
}

module "fineract_ui_stack" {
  source = "../../modules/helm_release"

  name      = "fineract-ui-stack"
  namespace = var.fineract_namespace
  chart     = "${local.charts_dir}/fineract-ui-stack"
  values_files = [
    "${local.charts_dir}/fineract-ui-stack/values.yaml",
    "${local.values_dir}/fineract-ui-stack.yaml",
  ]
  extra_values = [
    yamlencode({
      bootstrapChecksums = {
        sealedSecrets     = local.sealed_secret_bundle_checksum
        assetManagerNginx = local.asset_manager_nginx_checksum
      }
    })
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.keycloak,
    module.fineract_core,
    module.ingress_nginx,
  ]
}

module "azamra_edge" {
  source = "../../modules/helm_release"

  name      = "azamra-edge"
  namespace = var.fineract_namespace
  chart     = "${local.charts_dir}/azamra-edge"
  values_files = [
    "${local.charts_dir}/azamra-edge/values.yaml",
    "${local.values_dir}/azamra-edge.yaml",
  ]
  extra_values = [
    yamlencode({
      bootstrapChecksums = {
        sealedSecrets = local.sealed_secret_bundle_checksum
      }
      azamraKycManager = {
        publicIssuerAccess = {
          enabled = true
          ip      = data.kubernetes_service.ingress_nginx_controller.spec[0].cluster_ip
          port    = 80
        }
      }
    })
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.data_store,
    module.infra_cache,
    module.keycloak,
    module.fineract_core,
    module.fineract_app_services,
    module.ingress_nginx,
    terraform_data.sealed_secret_apply,
  ]
}

module "azamra_ui" {
  source = "../../modules/helm_release"

  name      = "azamra-ui"
  namespace = var.fineract_namespace
  chart     = "${local.charts_dir}/azamra-ui"
  values_files = [
    "${local.charts_dir}/azamra-ui/values.yaml",
    "${local.values_dir}/azamra-ui.yaml",
  ]
  timeout_seconds = var.release_timeout_seconds
  depends_on = [
    kubernetes_namespace.fineract,
    module.sealed_secrets,
    module.azamra_edge,
    module.ingress_nginx,
    terraform_data.sealed_secret_apply,
  ]
}
