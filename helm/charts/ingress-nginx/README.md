# Ingress NGINX Helm Chart

A local wrapper chart for the NGINX Ingress Controller. Provides a standardized configuration for traffic routing, logging, and security.

## Overview

The NGINX Ingress Controller is a specialized load balancer for Kubernetes environments. It uses a ConfigMap to store the NGINX configuration and an Ingress controller to monitor the Kubernetes API for Ingress resources.

## Quick Start

### 1. Install the Controller

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
| `ingress-nginx.controller.service.type` | Service type | `LoadBalancer` |

### Logging

The controller is pre-configured with a detailed `log-format-upstream` to facilitate troubleshooting and observability.

### Security

- **Non-root**: Runs as user 101.
- **Capabilities**: All default capabilities are dropped.
- **Privilege Escalation**: Disabled.

## Reference

- [Official Documentation](https://kubernetes.github.io/ingress-nginx/)
- [Chart Source](https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx)

## License

Apache-2.0
