{{/*
Expand the name of the chart.
*/}}
{{- define "azamra-edge.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "azamra-edge.fullname" -}}
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
Chart label
*/}}
{{- define "azamra-edge.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "azamra-edge.labels" -}}
helm.sh/chart: {{ include "azamra-edge.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
imagePullSecrets
*/}}
{{- define "azamra-edge.imagePullSecrets" -}}
{{- with .Values.global.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Azamra BFF labels
*/}}
{{- define "azamra-edge.bff.labels" -}}
app.kubernetes.io/name: azamra-bff
app.kubernetes.io/component: bff
{{ include "azamra-edge.labels" . }}
{{- end }}

{{/*
KYC Manager labels
*/}}
{{- define "azamra-edge.kyc.labels" -}}
app.kubernetes.io/name: kyc-manager
app.kubernetes.io/component: kyc
{{ include "azamra-edge.labels" . }}
{{- end }}

{{/*
User Storage labels
*/}}
{{- define "azamra-edge.user-storage.labels" -}}
app.kubernetes.io/name: user-storage
app.kubernetes.io/component: user-storage
{{ include "azamra-edge.labels" . }}
{{- end }}
