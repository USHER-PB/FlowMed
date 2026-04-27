output "name" {
  description = "Helm release name"
  value       = helm_release.this.name
}

output "namespace" {
  description = "Helm release namespace"
  value       = helm_release.this.namespace
}

output "chart" {
  description = "Helm chart"
  value       = helm_release.this.chart
}

output "chart_version" {
  description = "Helm chart version"
  value       = helm_release.this.version
}
