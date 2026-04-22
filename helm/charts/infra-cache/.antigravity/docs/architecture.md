# Infra-Cache Architecture: Why No Template Files?

When looking at the `keycloak` chart vs this `infra-cache` chart, you will notice a huge difference:
- **Keycloak** has a `templates/` folder full of files like `deployment.yaml`, `service.yaml`, `job-keycloak-config.yaml`.
- **Infra-Cache** only has `Chart.yaml` and `values.yaml`.

Why the difference?

## 1. The "Umbrella Chart" Pattern

The `infra-cache` chart uses what is known in Helm as the **Umbrella Chart Pattern**. 
This means our chart is just a "wrapper." It doesn't define *how* to deploy Redis; instead, it tells Helm: 
*"Please go download the official Bitnami Redis chart and the Prometheus Redis Exporter chart, and deploy them using these specific settings."*

We define this relationship in `Chart.yaml` under the `dependencies` block.

## 2. Why use this for Redis?

Redis is an extremely standard component. Running it in **HA (High Availability) Sentinel mode** requires a very complex setup:
- It needs a `StatefulSet` for the master.
- It needs a separate `StatefulSet` for the replicas.
- It needs Sentinel containers running alongside them to vote and promote a replica to master if the master fails.
- It needs specific `ConfigMaps` to handle the failover logic.

Writing and maintaining all of those Kubernetes YAML files yourself is extremely difficult and error-prone. The engineers at Bitnami have already spent thousands of hours writing the perfect Helm chart to deploy Redis HA securely. 
By pulling it in as a dependency, we get all that hard work for free. We just provide our custom `values.yaml` to overwrite their default passwords and storage settings.

## 3. Why didn't we do this for Keycloak?

You might wonder, why didn't we just use the official Keycloak chart?

The answer is **Custom Business Logic**.
In Fineract/Azamra, Keycloak needs very specific, custom behavior that the official chart doesn't support easily:
1.  **ArgoCD Hooks**: We needed a custom Kubernetes `Job` (`job-keycloak-config.yaml`) that waits for Keycloak to be ready, then imports the 1200-line `realm-fineract.yaml` file.
2.  **Keybound Plugin**: We needed a specific `initContainer` to download 5 different `.jar` files from GitHub and mount them into the Keycloak container before it starts.
3.  **Idempotency**: The Config CLI job needed special settings to ensure it doesn't crash if it runs twice during an ArgoCD sync.

Because our Keycloak setup is highly specific to Fineract, we needed to write the raw templates ourselves. **The templates *are* the blueprint.**

## Summary
- **infra-cache**: We use an **Umbrella Chart** because standard Redis HA is solved perfectly by the community. No custom logic is needed.
- **keycloak**: We use a **Custom Chart** (with `templates/`) because we needed specific Fineract banking logic, plugins, and ArgoCD hooks that don't exist in standard charts.
