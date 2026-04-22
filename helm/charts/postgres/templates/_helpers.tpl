{{/*
=============================================================================
PostgreSQL Chart - Template Helpers
=============================================================================
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "postgres.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "postgres.fullname" -}}
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
{{- define "postgres.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "postgres.labels" -}}
helm.sh/chart: {{ include "postgres.chart" . }}
{{ include "postgres.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: om-platform
app.kubernetes.io/component: database
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "postgres.selectorLabels" -}}
app.kubernetes.io/name: {{ include "postgres.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Common annotations
*/}}
{{- define "postgres.annotations" -}}
{{- with .Values.commonAnnotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "postgres.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "postgres.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "postgres.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end }}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "postgres.imagePullSecrets" -}}
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
{{- define "postgres.namespace" -}}
{{- default .Release.Namespace .Values.global.namespace -}}
{{- end }}

{{/*
Return the PostgreSQL secret name
*/}}
{{- define "postgres.secretName" -}}
{{- if .Values.auth.existingSecret }}
{{- .Values.auth.existingSecret }}
{{- else }}
{{- include "postgres.fullname" . }}
{{- end }}
{{- end }}

{{/*
Return the PostgreSQL host
*/}}
{{- define "postgres.host" -}}
{{- if eq .Values.mode "external" }}
{{- .Values.external.host }}
{{- else }}
{{- printf "%s.%s.svc.cluster.local" (include "postgres.fullname" .) (include "postgres.namespace" .) }}
{{- end }}
{{- end }}

{{/*
Return the PostgreSQL port
*/}}
{{- define "postgres.port" -}}
{{- if eq .Values.mode "external" }}
{{- .Values.external.port }}
{{- else }}
{{- .Values.service.port }}
{{- end }}
{{- end }}

{{/*
Return the PostgreSQL connection string
*/}}
{{- define "postgres.connectionString" -}}
{{- if eq .Values.mode "external" }}
{{- printf "postgresql://%s:%s@%s:%s/%s" .Values.external.database .Values.external.host (include "postgres.port" .) .Values.external.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:%s/%s" .Values.auth.username .Values.auth.database (include "postgres.host" .) (include "postgres.port" .) .Values.auth.database }}
{{- end }}
{{- end }}

{{/*
Return true if PostgreSQL is enabled and in standalone mode
*/}}
{{- define "postgres.standaloneEnabled" -}}
{{- if and .Values.enabled (eq .Values.mode "standalone") }}
true
{{- end }}
{{- end }}

{{/*
Return true if PostgreSQL is enabled and in internal (standalone or ha) mode
*/}}
{{- define "postgres.internalEnabled" -}}
{{- if and .Values.enabled (or (eq .Values.mode "standalone") (eq .Values.mode "ha")) }}
true
{{- end }}
{{- end }}

{{/*
Return true if PostgreSQL is in external mode
*/}}
{{- define "postgres.externalEnabled" -}}
{{- if eq .Values.mode "external" }}
true
{{- end }}
{{- end }}

{{/*
Generate random password if not provided
*/}}
{{- define "postgres.password" -}}
{{- if .Values.auth.password }}
{{- .Values.auth.password }}
{{- else }}
{{- randAlphaNum 16 }}
{{- end }}
{{- end }}

{{/*
Generate random postgres password if not provided
*/}}
{{- define "postgres.postgresPassword" -}}
{{- if .Values.auth.postgresPassword }}
{{- .Values.auth.postgresPassword }}
{{- else }}
{{- randAlphaNum 16 }}
{{- end }}
{{- end }}

{{/*
Return the PVC name
*/}}
{{- define "postgres.pvcName" -}}
{{- if .Values.persistence.existingClaim }}
{{- .Values.persistence.existingClaim }}
{{- else }}
{{- printf "%s-data" (include "postgres.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Return the priority class name
*/}}
{{- define "postgres.priorityClassName" -}}
{{- if .Values.primary.priorityClassName }}
{{- .Values.primary.priorityClassName }}
{{- else if .Values.global.priorityClassName }}
{{- .Values.global.priorityClassName }}
{{- end }}
{{- end }}
