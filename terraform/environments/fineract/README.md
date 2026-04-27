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

## Usage

```bash
terraform -chdir=terraform/environments/fineract init
terraform -chdir=terraform/environments/fineract plan
terraform -chdir=terraform/environments/fineract apply
```

By default, Terraform reads `~/.kube/fineract.yaml`. Override `kubeconfig_path`
or `kubeconfig_context` in `terraform.tfvars` if your local kubeconfig lives
elsewhere.

## Notes

- The environment expects a working kubeconfig and an already reachable cluster.
- SealedSecret manifests are applied before dependent Helm releases.
- `data-store` owns the CNPG bootstrap job that creates app databases from the
  sealed secrets, so the first apply is fully secret-driven.
- The chart values in `values/` only override environment-specific settings.
- Helm dependency resolution is enabled for wrapper charts so local chart
  dependencies are built automatically during install and upgrade.
