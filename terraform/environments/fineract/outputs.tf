output "namespace" {
  description = "Primary platform namespace"
  value       = var.fineract_namespace
}

output "sealed_secret_count" {
  description = "Number of sealed secret manifests applied by Terraform"
  value       = length(local.sealed_secret_checksums)
}

output "release_plan" {
  description = "Platform release names in deployment order"
  value = [
    "sealed-secrets",
    "metallb",
    "longhorn",
    "ingress-nginx",
    "cnpg",
    "data-store",
    "infra-cache",
    "keycloak",
    "fineract-core",
    "fineract-app-services",
    "fineract-ui-stack",
    "azamra-edge",
    "azamra-ui",
  ]
}

output "effective_hostnames" {
  description = "Effective public hostnames after applying overrides"
  value = merge({
    platform    = "fineract.local"
    api         = "api.fineract.local"
    auth        = "auth.fineract.local"
    bff         = "bff.fineract.local"
    kyc         = "kyc.fineract.local"
    mobile      = "mobile.fineract.local"
    portal      = "portal.fineract.local"
    admin       = "admin.fineract.local"
    accounts    = "accounts.fineract.local"
    accounting  = "accounting.fineract.local"
    assets      = "assets.fineract.local"
    branch      = "branch.fineract.local"
    cashier     = "cashier.fineract.local"
    reports     = "reports.fineract.local"
    selfservice = "selfservice.fineract.local"
    app         = "app.fineract.local"
  }, var.hostnames)
}

output "effective_secret_mode" {
  description = "Effective secret sourcing mode after resolving backward-compatible defaults"
  value       = coalesce(var.secret_mode, var.allow_secret_generation ? "hybrid" : "sealed")
}

output "effective_ingress_class_name" {
  description = "IngressClass used by platform ingresses"
  value       = var.ingress_class_name
}

output "effective_storage_class_name" {
  description = "StorageClass used by persistent platform workloads"
  value       = var.storage_class_name
}

output "effective_release_toggles" {
  description = "Requested top-level release toggles"
  value = merge({
    sealed_secrets       = true
    metallb              = true
    longhorn             = true
    ingress_nginx        = true
    cnpg                 = true
    data_store           = true
    infra_cache          = true
    keycloak             = true
    fineract_core        = true
    fineract_app_services = true
    fineract_ui_stack    = true
    azamra_edge          = true
    azamra_ui            = true
  }, var.release_toggles)
}

output "effective_service_toggles" {
  description = "Requested chart-level feature toggles"
  value       = var.service_toggles
}
