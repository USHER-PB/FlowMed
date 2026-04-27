variable "url_scheme" {
  description = "Public URL scheme used for ingress hosts"
  type        = string
  default     = "http"

  validation {
    condition     = contains(["http", "https"], var.url_scheme)
    error_message = "url_scheme must be either \"http\" or \"https\"."
  }
}

variable "realm_name" {
  description = "Keycloak realm name used by the platform"
  type        = string
  default     = "fineract"
}

variable "ingress_class_name" {
  description = "IngressClass used by platform ingresses. Set this to an existing controller class when ingress_nginx is disabled."
  type        = string
  default     = "nginx"
}

variable "storage_class_name" {
  description = "StorageClass used by persistent workloads. Set to an empty string to rely on the cluster default StorageClass."
  type        = string
  default     = "longhorn"
}

variable "public_issuer_access_ip" {
  description = "Optional IP used by the KYC manager host alias for auth host resolution when ingress_nginx is not managed here."
  type        = string
  default     = ""
}

variable "hostnames" {
  description = "Central hostname overrides for platform ingress and public URLs"
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for key in keys(var.hostnames) : contains([
        "platform",
        "api",
        "auth",
        "bff",
        "kyc",
        "mobile",
        "portal",
        "admin",
        "accounts",
        "accounting",
        "assets",
        "branch",
        "cashier",
        "reports",
        "selfservice",
        "app",
      ], key)
    ])
    error_message = "hostnames may only override known keys such as platform, auth, bff, kyc, mobile, and the UI hostnames."
  }
}

variable "release_toggles" {
  description = "Top-level Helm release toggles"
  type        = map(bool)
  default     = {}

  validation {
    condition = alltrue([
      for key in keys(var.release_toggles) : contains([
        "sealed_secrets",
        "metallb",
        "longhorn",
        "ingress_nginx",
        "cnpg",
        "data_store",
        "infra_cache",
        "keycloak",
        "fineract_core",
        "fineract_app_services",
        "fineract_ui_stack",
        "azamra_edge",
        "azamra_ui",
      ], key)
    ])
    error_message = "release_toggles may only contain known release names."
  }
}

variable "service_toggles" {
  description = "Chart-level feature toggles merged on top of the environment defaults"
  type        = map(bool)
  default     = {}

  validation {
    condition = alltrue([
      for key in keys(var.service_toggles) : contains([
        "data_store.postgres",
        "data_store.minio",
        "keycloak.ingress",
        "keycloak.keybound",
        "keycloak.config",
        "fineract_core.config_cli",
        "fineract_core.fineract_config",
        "fineract_core.database_init",
        "fineract_core.gateway",
        "fineract_core.gateway_ingress",
        "fineract_core.oauth2_proxy",
        "fineract_core.keycloak_init",
        "fineract_core.user_sync",
        "fineract_core.read",
        "fineract_core.write",
        "fineract_core.batch",
        "fineract_app_services.asset_service",
        "fineract_app_services.customer_self_service",
        "fineract_app_services.payment_gateway",
        "fineract_app_services.sms_gateway",
        "fineract_ui_stack.portal",
        "fineract_ui_stack.admin",
        "fineract_ui_stack.account_management",
        "fineract_ui_stack.accounting",
        "fineract_ui_stack.reporting",
        "fineract_ui_stack.branch",
        "fineract_ui_stack.cashier",
        "fineract_ui_stack.asset",
        "fineract_ui_stack.self_service",
        "fineract_ui_stack.web_app",
        "azamra_edge.bff",
        "azamra_edge.kyc_manager",
        "azamra_edge.user_storage",
        "azamra_edge.user_storage_init_database",
        "azamra_edge.kyc_public_issuer_access",
        "azamra_ui.ingress",
      ], key)
    ])
    error_message = "service_toggles may only contain known chart feature toggles."
  }
}

variable "secret_mode" {
  description = "Secret sourcing strategy: sealed requires encrypted manifests, hybrid prefers sealed and generates missing ones, generated ignores sealed files and creates Kubernetes Secrets."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition     = var.secret_mode == null || contains(["sealed", "hybrid", "generated"], var.secret_mode)
    error_message = "secret_mode must be one of sealed, hybrid, or generated."
  }
}

variable "allow_secret_generation" {
  description = "Backward-compatible fallback for secret generation. Prefer secret_mode for new environments."
  type        = bool
  default     = true
}

variable "generated_secret_literals" {
  description = "Optional literal overrides for generated secret data, keyed by logical secret id and data key"
  type        = map(map(string))
  default     = {}
  sensitive   = true
}
