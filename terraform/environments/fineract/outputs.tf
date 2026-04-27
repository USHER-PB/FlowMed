output "namespace" {
  description = "Primary platform namespace"
  value       = var.fineract_namespace
}

output "sealed_secret_count" {
  description = "Number of sealed secret manifests managed by Terraform"
  value       = length(local.sealed_secret_manifests)
}

output "release_plan" {
  description = "Platform release names in deployment order"
  value = [
    module.sealed_secrets.name,
    module.metallb.name,
    module.longhorn.name,
    module.ingress_nginx.name,
    module.cnpg.name,
    module.data_store.name,
    module.infra_cache.name,
    module.keycloak.name,
    module.fineract_core.name,
    module.fineract_app_services.name,
    module.fineract_ui_stack.name,
    module.azamra_edge.name,
  ]
}
