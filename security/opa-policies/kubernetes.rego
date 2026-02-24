# =============================================================================
# OPA Kubernetes Admission Policies
# =============================================================================
# These policies enforce security best practices for Kubernetes resources.
# =============================================================================

package kubernetes.admission

import future.keywords.in

# =============================================================================
# Deny Privileged Containers
# =============================================================================

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf("Privileged containers are not allowed: %s", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.initContainers[_]
    container.securityContext.privileged == true
    msg := sprintf("Privileged init containers are not allowed: %s", [container.name])
}

# =============================================================================
# Deny Running as Root
# =============================================================================

deny[msg] {
    input.request.kind.kind == "Pod"
    not input.request.object.spec.securityContext.runAsNonRoot
    container := input.request.object.spec.containers[_]
    not container.securityContext.runAsNonRoot
    msg := sprintf("Container must run as non-root: %s", [container.name])
}

# =============================================================================
# Require Resource Limits
# =============================================================================

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.cpu
    msg := sprintf("Container must have CPU limits: %s", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container must have memory limits: %s", [container.name])
}

# =============================================================================
# Deny Host Network/PID/IPC
# =============================================================================

deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.hostNetwork == true
    msg := "Host network is not allowed"
}

deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.hostPID == true
    msg := "Host PID namespace is not allowed"
}

deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.hostIPC == true
    msg := "Host IPC namespace is not allowed"
}

# =============================================================================
# Require Labels
# =============================================================================

required_labels := {"app.kubernetes.io/name", "app.kubernetes.io/team"}

deny[msg] {
    input.request.kind.kind == "Deployment"
    label := required_labels[_]
    not input.request.object.metadata.labels[label]
    msg := sprintf("Deployment must have label: %s", [label])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    label := required_labels[_]
    not input.request.object.metadata.labels[label]
    msg := sprintf("Pod must have label: %s", [label])
}

# =============================================================================
# Deny Latest Tag
# =============================================================================

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    endswith(container.image, ":latest")
    msg := sprintf("Container image must not use 'latest' tag: %s", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not contains(container.image, ":")
    msg := sprintf("Container image must specify a tag: %s", [container.name])
}

# =============================================================================
# Allowed Registries
# =============================================================================

allowed_registries := [
    "docker.io/",
    "gcr.io/",
    "ghcr.io/",
    "quay.io/",
    "public.ecr.aws/",
    "registry.k8s.io/"
]

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not registry_allowed(container.image)
    msg := sprintf("Image from unauthorized registry: %s", [container.image])
}

registry_allowed(image) {
    startswith(image, allowed_registries[_])
}

# Allow images without registry prefix (defaults to docker.io)
registry_allowed(image) {
    not contains(image, "/")
}

registry_allowed(image) {
    parts := split(image, "/")
    count(parts) == 2
    not contains(parts[0], ".")
}

# =============================================================================
# Deny Privilege Escalation
# =============================================================================

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.allowPrivilegeEscalation == true
    msg := sprintf("Privilege escalation is not allowed: %s", [container.name])
}

# =============================================================================
# Require Read-Only Root Filesystem
# =============================================================================

warn[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg := sprintf("Container should use read-only root filesystem: %s", [container.name])
}

# =============================================================================
# Deny NodePort Services (in production)
# =============================================================================

deny[msg] {
    input.request.kind.kind == "Service"
    input.request.object.spec.type == "NodePort"
    namespace := input.request.namespace
    endswith(namespace, "-prod")
    msg := "NodePort services are not allowed in production namespaces"
}

# =============================================================================
# Require Network Policies
# =============================================================================

warn[msg] {
    input.request.kind.kind == "Namespace"
    namespace := input.request.object.metadata.name
    not has_network_policy(namespace)
    msg := sprintf("Namespace should have a NetworkPolicy: %s", [namespace])
}

has_network_policy(namespace) {
    data.kubernetes.networkpolicies[namespace]
}
