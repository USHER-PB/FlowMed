{{/*
=============================================================================
MinIO Chart - Template Helpers
=============================================================================
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "minio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "minio.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "minio.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "minio.labels" -}}
helm.sh/chart: {{ include "minio.chart" . }}
{{ include "minio.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: om-platform
app.kubernetes.io/component: storage
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "minio.selectorLabels" -}}
app.kubernetes.io/name: {{ include "minio.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Common annotations
*/}}
{{- define "minio.annotations" -}}
{{- with .Values.commonAnnotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "minio.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "minio.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "minio.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end }}

{{/*
Return the proper mc image name
*/}}
{{- define "minio.mcImage" -}}
{{- printf "%s:%s" .Values.mcImage.repository .Values.mcImage.tag -}}
{{- end }}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "minio.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml .Values.global.imagePullSecrets | nindent 2 }}
{{- else if .Values.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml .Values.imagePullSecrets | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Return the namespace
*/}}
{{- define "minio.namespace" -}}
{{- default .Release.Namespace .Values.global.namespace -}}
{{- end }}

{{/*
Return the MinIO secret name
*/}}
{{- define "minio.secretName" -}}
{{- if .Values.auth.existingSecret }}
{{- .Values.auth.existingSecret }}
{{- else }}
{{- include "minio.fullname" . }}
{{- end }}
{{- end }}

{{/*
Return the MinIO endpoint
*/}}
{{- define "minio.endpoint" -}}
{{- printf "http://%s.%s.svc.cluster.local:%s" (include "minio.fullname" .) (include "minio.namespace" .) (.Values.service.apiPort | toString) }}
{{- end }}

{{/*
Return true if MinIO is enabled and in standalone mode
*/}}
{{- define "minio.standaloneEnabled" -}}
{{- if and .Values.enabled (eq .Values.mode "standalone") }}
true
{{- end }}
{{- end }}

{{/*
Return true if MinIO is enabled and in internal (standalone or distributed) mode
*/}}
{{- define "minio.internalEnabled" -}}
{{- if and .Values.enabled (or (eq .Values.mode "standalone") (eq .Values.mode "distributed")) }}
true
{{- end }}
{{- end }}

{{/*
Return true if MinIO is enabled and in distributed mode
*/}}
{{- define "minio.distributedEnabled" -}}
{{- if and .Values.enabled (eq .Values.mode "distributed") }}
true
{{- end }}
{{- end }}

{{/*
Return the number of replicas based on mode
*/}}
{{- define "minio.replicas" -}}
{{- if eq .Values.mode "distributed" }}
{{- .Values.distributed.replicas | default 4 }}
{{- else }}
{{- .Values.replicaCount | default 1 }}
{{- end }}
{{- end }}

{{/*
Return the storage size based on mode
*/}}
{{- define "minio.storageSize" -}}
{{- if eq .Values.mode "distributed" }}
{{- .Values.distributed.storage.size | default "10Gi" }}
{{- else }}
{{- .Values.persistence.size | default "5Gi" }}
{{- end }}
{{- end }}

{{/*
Return the drives per node for distributed mode
*/}}
{{- define "minio.drivesPerNode" -}}
{{- if eq .Values.mode "distributed" }}
{{- .Values.distributed.drivesPerNode | default 1 }}
{{- else }}
1
{{- end }}
{{- end }}

{{/*
Generate pod anti-affinity for distributed mode
*/}}
{{- define "minio.podAntiAffinity" -}}
{{- if and (eq .Values.mode "distributed") .Values.distributed.podAntiAffinity.enabled }}
{{- if eq .Values.distributed.podAntiAffinity.type "required" }}
requiredDuringSchedulingIgnoredDuringExecution:
  - labelSelector:
      matchLabels:
        {{- include "minio.selectorLabels" . | nindent 6 }}
        app.kubernetes.io/component: server
    topologyKey: {{ .Values.distributed.podAntiAffinity.topologyKey | default "kubernetes.io/hostname" }}
{{- else }}
preferredDuringSchedulingIgnoredDuringExecution:
  - weight: {{ .Values.distributed.podAntiAffinity.weight | default 100 }}
    podAffinityTerm:
      labelSelector:
        matchLabels:
          {{- include "minio.selectorLabels" . | nindent 8 }}
          app.kubernetes.io/component: server
      topologyKey: {{ .Values.distributed.podAntiAffinity.topologyKey | default "kubernetes.io/hostname" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Return true if bucket init job should be created
*/}}
{{- define "minio.bucketInitEnabled" -}}
{{- if and (include "minio.internalEnabled" .) .Values.bucketInit.enabled .Values.buckets }}
true
{{- end }}
{{- end }}

{{/*
Generate random password if not provided
*/}}
{{- define "minio.rootPassword" -}}
{{- if .Values.auth.rootPassword }}
{{- .Values.auth.rootPassword }}
{{- else }}
{{- randAlphaNum 16 }}
{{- end }}
{{- end }}

{{/*
Return the PVC name
*/}}
{{- define "minio.pvcName" -}}
{{- if .Values.persistence.existingClaim }}
{{- .Values.persistence.existingClaim }}
{{- else }}
{{- printf "%s-data" (include "minio.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Return the priority class name
*/}}
{{- define "minio.priorityClassName" -}}
{{- if .Values.pod.priorityClassName }}
{{- .Values.pod.priorityClassName }}
{{- else if .Values.global.priorityClassName }}
{{- .Values.global.priorityClassName }}
{{- end }}
{{- end }}

