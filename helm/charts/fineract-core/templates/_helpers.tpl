{{/*
=============================================================================
Fineract Core Chart - Template Helpers
=============================================================================
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "fineract-core.name" -}}
{{- default .Chart.Name .Values.name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "fineract-core.fullname" -}}
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
{{- define "fineract-core.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "fineract-core.labels" -}}
helm.sh/chart: {{ include "fineract-core.chart" . }}
{{ include "fineract-core.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: fineract-platform
{{- if .Values.global.environment }}
app.kubernetes.io/environment: {{ .Values.global.environment }}
{{- end }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "fineract-core.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fineract-core.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "fineract-core.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "fineract-core.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper Fineract image name
*/}}
{{- define "fineract-core.fineractImage" -}}
{{- $tag := .Values.fineract.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.fineract.image.repository $tag -}}
{{- end }}

{{/*
Return the proper Gateway image name
*/}}
{{- define "fineract-core.gatewayImage" -}}
{{- printf "%s:%s" .Values.gateway.image.repository .Values.gateway.image.tag -}}
{{- end }}

{{/*
Return the proper OAuth2 Proxy image name
*/}}
{{- define "fineract-core.oauth2ProxyImage" -}}
{{- printf "%s:%s" .Values.oauth2Proxy.image.repository .Values.oauth2Proxy.image.tag -}}
{{- end }}

{{/*
Return the proper User Sync image name
*/}}
{{- define "fineract-core.userSyncImage" -}}
{{- printf "%s:%s" .Values.userSync.image.repository .Values.userSync.image.tag -}}
{{- end }}

{{/*
Return the proper Config CLI image name
*/}}
{{- define "fineract-core.configCliImage" -}}
{{- printf "%s:%s" .Values.configCli.image.repository .Values.configCli.image.tag -}}
{{- end }}

{{/*
Common annotations
*/}}
{{- define "fineract-core.annotations" -}}
{{- with .Values.commonAnnotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Labels for Fineract Read instance
*/}}
{{- define "fineract-core.read.labels" -}}
{{ include "fineract-core.labels" . }}
app.kubernetes.io/component: fineract-read
fineract.instance-type: read
{{- end }}

{{/*
Labels for Fineract Write instance
*/}}
{{- define "fineract-core.write.labels" -}}
{{ include "fineract-core.labels" . }}
app.kubernetes.io/component: fineract-write
fineract.instance-type: write
{{- end }}

{{/*
Labels for Fineract Batch instance
*/}}
{{- define "fineract-core.batch.labels" -}}
{{ include "fineract-core.labels" . }}
app.kubernetes.io/component: fineract-batch
fineract.instance-type: batch
{{- end }}

{{/*
Labels for Gateway component
*/}}
{{- define "fineract-core.gateway.labels" -}}
{{ include "fineract-core.labels" . }}
app.kubernetes.io/component: gateway
{{- end }}

{{/*
Labels for OAuth2 Proxy component
*/}}
{{- define "fineract-core.oauth2Proxy.labels" -}}
{{ include "fineract-core.labels" . }}
app.kubernetes.io/component: oauth2-proxy
{{- end }}

{{/*
Labels for User Sync component
*/}}
{{- define "fineract-core.userSync.labels" -}}
{{ include "fineract-core.labels" . }}
app.kubernetes.io/component: user-sync
{{- end }}

{{/*
Labels for Config CLI component
*/}}
{{- define "fineract-core.configCli.labels" -}}
{{ include "fineract-core.labels" . }}
app.kubernetes.io/component: config-cli
{{- end }}

{{/*
Selector labels for Fineract Read instance
*/}}
{{- define "fineract-core.read.selectorLabels" -}}
{{ include "fineract-core.selectorLabels" . }}
app.kubernetes.io/component: fineract-read
{{- end }}

{{/*
Selector labels for Fineract Write instance
*/}}
{{- define "fineract-core.write.selectorLabels" -}}
{{ include "fineract-core.selectorLabels" . }}
app.kubernetes.io/component: fineract-write
{{- end }}

{{/*
Selector labels for Fineract Batch instance
*/}}
{{- define "fineract-core.batch.selectorLabels" -}}
{{ include "fineract-core.selectorLabels" . }}
app.kubernetes.io/component: fineract-batch
{{- end }}

{{/*
Selector labels for Gateway component
*/}}
{{- define "fineract-core.gateway.selectorLabels" -}}
{{ include "fineract-core.selectorLabels" . }}
app.kubernetes.io/component: gateway
{{- end }}

{{/*
Selector labels for OAuth2 Proxy component
*/}}
{{- define "fineract-core.oauth2Proxy.selectorLabels" -}}
{{ include "fineract-core.selectorLabels" . }}
app.kubernetes.io/component: oauth2-proxy
{{- end }}

{{/*
Selector labels for User Sync component
*/}}
{{- define "fineract-core.userSync.selectorLabels" -}}
{{ include "fineract-core.selectorLabels" . }}
app.kubernetes.io/component: user-sync
{{- end }}
