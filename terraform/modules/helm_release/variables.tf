variable "name" {
  description = "Helm release name"
  type        = string
}

variable "enabled" {
  description = "Whether to manage this Helm release"
  type        = bool
  default     = true
}

variable "namespace" {
  description = "Target namespace for the release"
  type        = string
}

variable "chart" {
  description = "Helm chart name or local chart path"
  type        = string
}

variable "repository" {
  description = "Helm repository URL for remote charts. Use null for local charts."
  type        = string
  default     = null
}

variable "chart_version" {
  description = "Helm chart version"
  type        = string
  default     = null
}

variable "values_files" {
  description = "List of YAML values files to merge in order"
  type        = list(string)
  default     = []
}

variable "extra_values" {
  description = "Additional raw YAML values documents to merge after values_files"
  type        = list(string)
  default     = []
}

variable "create_namespace" {
  description = "Create the namespace if it does not exist"
  type        = bool
  default     = true
}

variable "wait" {
  description = "Wait for the release to become ready"
  type        = bool
  default     = true
}

variable "wait_for_jobs" {
  description = "Wait for Helm hook jobs to finish"
  type        = bool
  default     = true
}

variable "atomic" {
  description = "Use atomic Helm upgrades"
  type        = bool
  default     = true
}

variable "cleanup_on_fail" {
  description = "Clean up failed Helm release state"
  type        = bool
  default     = true
}

variable "replace" {
  description = "Replace an existing release if Helm detects a name collision"
  type        = bool
  default     = false
}

variable "dependency_update" {
  description = "Run helm dependency update before install/upgrade"
  type        = bool
  default     = true
}

variable "skip_crds" {
  description = "Skip CRD installation"
  type        = bool
  default     = false
}

variable "timeout_seconds" {
  description = "Helm timeout in seconds"
  type        = number
  default     = 1200
}

variable "max_history" {
  description = "Maximum number of release revisions to retain"
  type        = number
  default     = 10
}
