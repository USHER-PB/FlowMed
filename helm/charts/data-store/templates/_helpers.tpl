{{/*
=============================================================================
Data Store Umbrella Chart - Template Helpers
=============================================================================
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "data-store.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "data-store.fullname" -}}
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
{{- define "data-store.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "data-store.labels" -}}
helm.sh/chart: {{ include "data-store.chart" . }}
app.kubernetes.io/name: {{ include "data-store.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: om-platform
{{- end }}

{{/*
Return the namespace
*/}}
{{- define "data-store.namespace" -}}
{{- default .Release.Namespace .Values.global.namespace -}}
{{- end }}

{{/*
Return PostgreSQL host (for use in NOTES.txt)
*/}}
{{- define "data-store.postgresHost" -}}
{{- if .Values.postgres.enabled }}
{{- printf "%s-postgres.%s.svc.cluster.local" .Release.Name (include "data-store.namespace" .) }}
{{- else if eq .Values.postgres.mode "external" }}
{{- .Values.postgres.external.host }}
{{- end }}
{{- end }}

{{/*
Return MinIO endpoint (for use in NOTES.txt)
*/}}
{{- define "data-store.minioEndpoint" -}}
{{- if .Values.minio.enabled }}
{{- printf "http://%s-minio.%s.svc.cluster.local:9000" .Release.Name (include "data-store.namespace" .) }}
{{- else if eq .Values.minio.mode "external" }}
{{- printf "https://%s" .Values.minio.external.endpoint }}
{{- end }}
{{- end }}
