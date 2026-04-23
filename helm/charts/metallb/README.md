# MetalLB Helm Chart

A Helm chart for MetalLB - a load-balancer implementation for Kubernetes bare-metal clusters.

## Overview

MetalLB provides a network load-balancer implementation for Kubernetes clusters that don't run on a supported cloud provider. It allows you to use Kubernetes LoadBalancer services in bare-metal, on-prem, or virtualized environments.

## Features

- Layer 2 mode (ARP/NDP) for simple network setups
- BGP mode for advanced routing
- Multiple IP address pools
- Automatic IP assignment
- Prometheus monitoring support

## Prerequisites

- Kubernetes 1.13+
- Helm 3.0+
- Network configuration that allows ARP/NDP or BGP

## Installation

### Quick Start

```bash
# Install with default values (L2 mode, IP range 192.168.1.200-210)
helm install metallb ./helm/charts/metallb

# Or with custom IP range
helm install metallb ./helm/charts/metallb \
  --set ipAddressPools.primary.addresses[0]="10.0.0.100-10.0.0.200"
```

### Production Setup

```bash
# Create a values file for production
cat > metallb-values.yaml <<EOF
ipAddressPools:
  primary:
    enabled: true
    addresses:
      - "192.168.1.200-192.168.1.210"
    autoAssign: true
  secondary:
    enabled: true
    addresses:
      - "192.168.1.211-192.168.1.220"
    autoAssign: false

l2Advertisement:
  enabled: true

monitoring:
  enabled: true
EOF

helm install metallb ./helm/charts/metallb -f metallb-values.yaml
```

## Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enabled` | Enable MetalLB | `true` |
| `namespace` | MetalLB namespace | `metallb-system` |

### IP Address Pools

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ipAddressPools.primary.enabled` | Enable primary pool | `true` |
| `ipAddressPools.primary.addresses` | IP address ranges | `["192.168.1.200-192.168.1.210"]` |
| `ipAddressPools.primary.autoAssign` | Auto-assign IPs | `true` |
| `ipAddressPools.primary.name` | Pool name (optional) | `""` |

### L2 Advertisement

| Parameter | Description | Default |
|-----------|-------------|---------|
| `l2Advertisement.enabled` | Enable L2 mode | `true` |
| `l2Advertisement.ipAddressPools` | Pools to advertise | `[]` (all) |
| `l2Advertisement.nodeSelectors` | Node selectors | `[]` |

### BGP Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `bgp.enabled` | Enable BGP mode | `false` |
| `bgp.myASN` | Local ASN | `64512` |
| `bgp.peers` | BGP peer list | `[]` |
| `bgpAdvertisement.enabled` | Enable BGP ads | `false` |

### Speaker Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `speaker.enabled` | Enable speaker | `true` |
| `speaker.logLevel` | Log level | `info` |
| `speaker.resources` | Resource limits | See values.yaml |

### Controller Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `controller.enabled` | Enable controller | `true` |
| `controller.logLevel` | Log level | `info` |
| `controller.resources` | Resource limits | See values.yaml |

### Monitoring

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoring.enabled` | Enable Prometheus | `false` |
| `monitoring.prometheusNamespace` | Prometheus namespace | `monitoring` |

## IP Address Pool Examples

### Single Range

```yaml
ipAddressPools:
  primary:
    enabled: true
    addresses:
      - "192.168.1.200-192.168.1.210"
```

### Multiple Ranges

```yaml
ipAddressPools:
  primary:
    enabled: true
    addresses:
      - "192.168.1.200-192.168.1.210"
      - "10.0.0.100/28"
```

### CIDR Notation

```yaml
ipAddressPools:
  primary:
    enabled: true
    addresses:
      - "192.168.1.0/24"
```

### Specific IPs

```yaml
ipAddressPools:
  primary:
    enabled: true
    addresses:
      - "192.168.1.200"
      - "192.168.1.201"
      - "192.168.1.202"
```

## Layer 2 vs BGP Mode

### Layer 2 Mode (Recommended for Simple Setups)

- Uses ARP (IPv4) or NDP (IPv6) to announce IPs
- Works on any Ethernet network
- No special router configuration needed
- Single node handles all traffic for an IP

```yaml
l2Advertisement:
  enabled: true
```

### BGP Mode (For Advanced Setups)

- Announces IPs via BGP routing protocol
- Requires BGP-capable routers
- True load balancing across nodes
- Better for large-scale deployments

```yaml
bgp:
  enabled: true
  myASN: 64512
  peers:
    - name: router-1
      enabled: true
      address: "192.168.1.1"
      asn: 64513

bgpAdvertisement:
  enabled: true
```

## Usage

### Create a LoadBalancer Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

### Request Specific IP

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.205
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

### Use Specific IP Pool

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    metallb.universe.tf/address-pool: secondary
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

## Verification

### Check MetalLB Pods

```bash
kubectl get pods -n metallb-system
```

### Check IP Address Pools

```bash
kubectl get ipaddresspools -n metallb-system
```

### Check L2 Advertisements

```bash
kubectl get l2advertisements -n metallb-system
```

### Check LoadBalancer Services

```bash
kubectl get svc -A | grep LoadBalancer
```

## Troubleshooting

### No External IP Assigned

1. Check MetalLB pods are running:
   ```bash
   kubectl get pods -n metallb-system
   ```

2. Check IP pool configuration:
   ```bash
   kubectl describe ipaddresspools -n metallb-system
   ```

3. Check speaker logs:
   ```bash
   kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker
   ```

### IP Not Reachable

1. Verify L2 advertisement:
   ```bash
   kubectl get l2advertisements -n metallb-system
   ```

2. Check ARP table on client:
   ```bash
   arp -a | grep <external-ip>
   ```

3. Verify node network connectivity.

## Security Considerations

- MetalLB requires privileged access for ARP/NDP
- BGP mode requires network access to routers
- Consider network policies to restrict access
- Use RBAC to limit MetalLB permissions

## Upgrading

```bash
helm upgrade metallb ./helm/charts/metallb
```

## Uninstalling

```bash
helm uninstall metallb
kubectl delete namespace metallb-system
```

## License

Apache 2.0
