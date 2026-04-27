# Fineract Terraform Bootstrap

This environment manages the live on-prem Kubernetes platform for the Fineract stack.

## Scope

- Sealed Secrets controller
- MetalLB
- Longhorn
- ingress-nginx
- CloudNativePG operator
- data-store
- infra-cache
- keycloak
- fineract-core
- fineract-app-services
- fineract-ui-stack
- azamra-edge
- azamra-ui

## Usage

```bash
terraform -chdir=terraform/environments/fineract init
terraform -chdir=terraform/environments/fineract plan
terraform -chdir=terraform/environments/fineract apply
```

By default, Terraform reads `~/.kube/fineract-k3s.yaml`. Override `kubeconfig_path`
or `kubeconfig_context` in `terraform.tfvars` if your local kubeconfig lives
elsewhere.

## Central Controls

The environment now exposes three central control surfaces:

1. `release_toggles`
   Use this to enable or disable entire Helm releases such as `data_store`,
   `keycloak`, `fineract_app_services`, or `azamra_ui`.

2. `service_toggles`
   Use this to enable or disable chart-level features without removing the
   whole release. Examples:
   - `data_store.postgres`
   - `data_store.minio`
   - `fineract_core.read`
   - `fineract_core.write`
   - `fineract_core.batch`
   - `fineract_app_services.asset_service`
   - `fineract_app_services.customer_self_service`
   - `fineract_app_services.payment_gateway`
   - `fineract_app_services.sms_gateway`
   - `fineract_ui_stack.portal`
   - `fineract_ui_stack.admin`
   - `azamra_edge.bff`
   - `azamra_edge.kyc_manager`
   - `azamra_edge.user_storage`

3. `hostnames` plus `url_scheme`
   Use these to change public domains in one place instead of editing every
   values file.

There are also three cluster-integration controls:

4. `ingress_class_name`
   Use this when the cluster already has an ingress controller and you do not
   want Terraform to manage `ingress-nginx`.

5. `storage_class_name`
   Use this to point persistent workloads at an existing StorageClass instead of
   assuming Longhorn. Set it to `""` to rely on the cluster default
   StorageClass.

6. `public_issuer_access_ip`
   Use this only when `azamra_edge.kyc_public_issuer_access` is enabled and the
   KYC manager must resolve `auth.<domain>` through a manually supplied IP
   instead of the repo-managed `ingress-nginx` service.

Example:

```hcl
url_scheme = "https"
ingress_class_name = "nginx"
storage_class_name = "longhorn"

hostnames = {
  platform = "bank.example.com"
  auth     = "auth.bank.example.com"
  bff      = "bff.bank.example.com"
  kyc      = "kyc.bank.example.com"
  mobile   = "mobile.bank.example.com"
}

release_toggles = {
  azamra_ui = false
}

service_toggles = {
  "data_store.minio"                = false
  "fineract_core.batch"             = false
  "fineract_app_services.sms_gateway" = false
}
```

## Secrets

Terraform now supports three secret modes:

- `sealed`
  Every managed secret must be supplied as a SealedSecret manifest.

- `hybrid`
  Terraform prefers SealedSecret files, but it generates compatible Kubernetes
  Secrets for any missing files.

- `generated`
  Terraform ignores `configs/secrets` and generates every managed Kubernetes
  Secret directly.

For backward compatibility, older setups can still rely on
`allow_secret_generation`, but new environments should set `secret_mode`
explicitly.

- If a sealed file exists and `secret_mode` is not `generated`, Terraform
  applies it first.
- If a managed sealed file is absent and the mode allows generation, Terraform
  creates a compatible Secret with the right keys for that chart.
- `generated_secret_literals` lets you inject literal values for things that
  should not be random, such as `.dockerconfigjson` for `ghcr-credentials`.

For shared or production environments, keep SealedSecrets as the source of
truth. Generated secrets are best used for bootstrap or disposable dev setups,
because their values live in Terraform state.

Example:

```hcl
secret_mode = "hybrid"

generated_secret_literals = {
  ghcr_credentials = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "ghcr.io" = {
          auth = "BASE64_USER_COLON_TOKEN"
        }
      }
    })
  }
}
```

## Notes

- The environment expects a working kubeconfig and an already reachable cluster.
- SealedSecret manifests are applied before dependent Helm releases, and missing
  ones fall back to generated Kubernetes Secrets when the configured secret mode
  allows it.
- `data-store` owns the CNPG bootstrap job that creates app databases from the
  managed secrets, so the first apply is still secret-driven.
- The chart values in `values/` only override environment-specific settings.
- Helm dependency resolution is enabled for wrapper charts so local chart
  dependencies are built automatically during install and upgrade.
- `terraform plan` now also outputs `effective_hostnames`,
  `effective_secret_mode`, `effective_ingress_class_name`,
  `effective_storage_class_name`,
  `effective_release_toggles`, and `effective_service_toggles` so operators can
  see the final merged configuration quickly.
- If you disable `ingress_nginx`, leave `ingress_class_name` set to the class of
  your existing ingress controller.
- If you disable `longhorn`, point `storage_class_name` at your cluster storage
  class or set it to `""` to rely on the default StorageClass.
