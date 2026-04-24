# Ingress NGINX Helm Chart

A local wrapper chart for the NGINX Ingress Controller. Provides a standardized configuration for traffic routing, logging, and security.

## Overview

The NGINX Ingress Controller is a specialized load balancer for Kubernetes environments. It uses a ConfigMap to store the NGINX configuration and an Ingress controller to monitor the Kubernetes API for Ingress resources.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- MetalLB or another LoadBalancer provider (for on-prem clusters)

## Quick Start

### 1. Install MetalLB (Required for on-prem clusters)

```bash
# Install MetalLB first
helm install metallb ./helm/charts/metallb -n metallb-system --create-namespace
```

### 2. Install the Ingress Controller

```bash
helm dependency build ./helm/charts/ingress-nginx
helm install ingress-nginx ./helm/charts/ingress-nginx \
  -n ingress-nginx --create-namespace
```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress-nginx.enabled` | Enable the controller | `true` |
| `ingress-nginx.controller.replicaCount` | Number of replicas | `1` |
| `ingress-nginx.controller.hostNetwork` | Use host network | `false` |
| `ingress-nginx.controller.service.type` | Service type | `LoadBalancer` |

### LoadBalancer Mode

The chart uses `service.type: LoadBalancer` which requires a LoadBalancer provider like MetalLB. When MetalLB is installed:

- MetalLB assigns an external IP from the configured pool
- The ingress controller is accessible on the assigned external IP
- Ports 80 and 443 are exposed through the LoadBalancer service

### Host Network Mode (Alternative)

For clusters without a LoadBalancer provider, you can use `hostNetwork: true`:

```yaml
ingress-nginx:
  controller:
    hostNetwork: true
    hostPort:
      enabled: true
      ports:
        http: 80
        https: 443
    service:
      type: ClusterIP
```

This binds the ingress controller directly to ports 80 and 443 on the node.

**Note**: When using `hostNetwork: true`, only one replica can run per node due to port conflicts.

### Logging

The controller is pre-configured with a detailed `log-format-upstream` to facilitate troubleshooting and observability.

### Security

- **Non-root**: Runs as user 101.
- **Capabilities**: All default capabilities are dropped, only `NET_BIND_SERVICE` is added.
- **Privilege Escalation**: Disabled.

## Accessing Services

After installation, ingress resources can route traffic to your services:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: myapp.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 80
```

Then add to your `/etc/hosts`:
```
<EXTERNAL_IP> myapp.local
```

Get the external IP:
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

## Verification

```bash
# Check the service has an external IP
kubectl get svc -n ingress-nginx

# Check pods are running
kubectl get pods -n ingress-nginx
```

## Reference

- [Official Documentation](https://kubernetes.github.io/ingress-nginx/)
- [Chart Source](https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx)

## License

Apache-2.0
