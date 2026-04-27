# KYC OIDC Incident Notes

## Summary

The `azamra-kyc-manager` login flow was failing in two stages:

1. `GET /api/auth/login` returned `500` because the KYC pod could not reliably reach the public Keycloak issuer host `auth.fineract.local`.
2. After issuer reachability was fixed, Keycloak rejected the browser redirect with `invalid parameter: redirect_uri` because the `kyc-manager` client was still configured for the older `/kyc-manager/...` callback pattern.

## Root Cause

### 1. Public issuer was not reachable from the KYC pod

The KYC app uses the public issuer:

`http://auth.fineract.local/realms/fineract`

That host only existed through workstation-level `/etc/hosts`, so it was not resolvable from inside Kubernetes.

An early CoreDNS rewrite attempt was not valid because it rewrote the hostname directly to the Keycloak service, while the app still expected the public issuer semantics and ingress path.

### 2. Internal issuer override caused an OIDC issuer mismatch

The KYC deployment was injecting an internal issuer override:

`http://keycloak:8080/realms/fineract`

But Keycloak discovery still advertised:

`http://auth.fineract.local/realms/fineract`

The OIDC library rejected that mismatch and failed with:

`OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED`

### 3. Keycloak client redirect URIs were stale

Once login began redirecting correctly, Keycloak still rejected:

`http://kyc.fineract.local/api/auth/callback`

The live `kyc-manager` client only allowed older redirect URI patterns such as:

- `http://fineract.local/kyc-manager/*`
- `http://.../api/auth/callback/keycloak`

## Repo Fixes

### `helm/charts/azamra-edge/templates/kyc-manager/deployment.yaml`

- Added optional `hostAliases` support for `auth.fineract.local`
- Made `OAUTH2_INTERNAL_ISSUER` optional instead of always setting it

This keeps the KYC app on the public issuer while allowing a dev-only override for internal name resolution.

### `helm/charts/azamra-edge/templates/networkpolicy.yaml`

- Added optional egress from `azamra-kyc-manager` to the ingress path used for the public issuer
- Scoped the old Keycloak `:8080` egress rule so it is only rendered when `oauth2.internalIssuer` is explicitly set

### `helm/charts/azamra-edge/values.yaml`

- Added `azamraKycManager.publicIssuerAccess`
- Documented `oauth2.internalIssuer` as optional and only valid when discovery metadata matches the same issuer

### `helm/values/dev/azamra-edge-values.yaml`

Dev-only override used in the current cluster:

- enables `publicIssuerAccess`
- maps `auth.fineract.local` to the ingress controller service `ClusterIP`

This is acceptable for local/dev use, but it is not the preferred long-term solution because the service `ClusterIP` is environment-specific.

## Live Cluster Changes

The live Keycloak `kyc-manager` client was updated to allow the current KYC URLs:

- `http://kyc.fineract.local/*`
- `http://kyc.fineract.local/api/auth/callback`
- `http://kyc.fineract.local/api/auth/callback/keycloak`

Its `rootUrl`, `adminUrl`, `webOrigins`, and `post.logout.redirect.uris` were also updated to include `http://kyc.fineract.local`.

These live changes are not represented in this branch because the Keycloak realm template lives in the auth-extension branch.

## Validation

After the Helm rollout:

- `deployment/azamra-kyc-manager` rolled out successfully
- `GET http://kyc.fineract.local/api/auth/login` returned `307 Temporary Redirect`
- the redirect target used the public Keycloak issuer
- the KYC app set the expected OAuth state and PKCE cookies

After the live Keycloak client update:

- Keycloak accepted `redirect_uri=http://kyc.fineract.local/api/auth/callback`

## Recommended Long-Term Architecture

Best practice is:

- keep the issuer public and stable, ideally `https://auth.fineract.local/...`
- make that same hostname resolvable both outside and inside the cluster
- avoid using the internal Keycloak service URL as the issuer
- prefer real DNS or split-horizon DNS over pod-level host aliases for durable environments

## Follow-Up

The auth-extension branch should be updated so the `kyc-manager` Keycloak client definition matches the current callback URL pattern:

- `http://kyc.fineract.local/api/auth/callback`

Otherwise a future Keycloak reconfiguration may reintroduce the redirect URI problem.
