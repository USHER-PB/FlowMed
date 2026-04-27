resource "helm_release" "this" {
  name              = var.name
  namespace         = var.namespace
  create_namespace  = var.create_namespace
  chart             = var.chart
  repository        = var.repository
  version           = var.chart_version
  values            = concat([for path in var.values_files : file(path)], var.extra_values)
  wait              = var.wait
  wait_for_jobs     = var.wait_for_jobs
  atomic            = var.atomic
  cleanup_on_fail   = var.cleanup_on_fail
  replace           = var.replace
  dependency_update = var.dependency_update
  skip_crds         = var.skip_crds
  timeout           = var.timeout_seconds
  max_history       = var.max_history
}
