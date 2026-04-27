variable "kubeconfig_path" {
  description = "Path to the kubeconfig file used by Terraform"
  type        = string
  default     = "~/.kube/fineract-k3s.yaml"
}

variable "kubeconfig_context" {
  description = "Optional kubeconfig context to use"
  type        = string
  default     = ""
}

variable "fineract_namespace" {
  description = "Primary namespace for the Fineract platform"
  type        = string
  default     = "fineract"
}

variable "sealed_secret_files" {
  description = "Map of sealed secret resource names to YAML files"
  type        = map(string)
  default     = {}
}

variable "cnpg_chart_version" {
  description = "CloudNativePG chart version"
  type        = string
  default     = "0.28.0"
}

variable "release_timeout_seconds" {
  description = "Default Helm timeout for platform releases"
  type        = number
  default     = 1200
}
