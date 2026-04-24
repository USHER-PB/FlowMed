{{/*
=============================================================================
Fineract UI Stack Chart - Template Helpers
=============================================================================
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "fineract-ui-stack.name" -}}
{{- default .Chart.Name .Values.name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "fineract-ui-stack.fullname" -}}
{{- if .Values.name }}
{{- .Values.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.name }}
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
{{- define "fineract-ui-stack.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "fineract-ui-stack.labels" -}}
helm.sh/chart: {{ include "fineract-ui-stack.chart" . }}
{{ include "fineract-ui-stack.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: fineract-ui-stack
{{- end }}

{{/*
Selector labels
*/}}
{{- define "fineract-ui-stack.selectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "fineract-ui-stack.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "fineract-ui-stack.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name for a UI application
*/}}
{{- define "fineract-ui-stack.image" -}}
{{- $tag := .tag | default "latest" -}}
{{- printf "%s:%s" .repository $tag -}}
{{- end }}

{{/*
Create labels for a specific UI application
*/}}
{{- define "fineract-ui-stack.appLabels" -}}
app.kubernetes.io/name: {{ .appName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: ui
app.kubernetes.io/part-of: fineract-ui-stack
{{- end }}

{{/*
Create selector labels for a specific UI application
*/}}
{{- define "fineract-ui-stack.appSelectorLabels" -}}
app.kubernetes.io/name: {{ .appName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{/*
Generate config.json content for a UI application
*/}}
{{- define "fineract-ui-stack.configJson" -}}
{
  "apiEndpoint": "{{ .root.Values.global.apiEndpoint }}",
  "keycloak": {
    "url": "{{ .root.Values.global.keycloak.url }}",
    "realm": "{{ .root.Values.global.keycloak.realm }}",
    "clientId": "{{ .clientId }}",
    "redirectUri": "https://{{ .hostname }}"
  }
}
{{- end }}
