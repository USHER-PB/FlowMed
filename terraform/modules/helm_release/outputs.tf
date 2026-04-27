output "name" {
  description = "Helm release name"
  value       = var.name
}

output "enabled" {
  description = "Whether the Helm release is managed"
  value       = var.enabled
}

output "namespace" {
  description = "Helm release namespace"
  value       = var.namespace
}

output "chart" {
  description = "Helm chart"
  value       = var.chart
}

output "chart_version" {
  description = "Helm chart version"
  value       = var.chart_version
}
