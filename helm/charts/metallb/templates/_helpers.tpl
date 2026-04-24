{{/*
Expand the name of the chart.
*/}}
{{- define "metallb.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "metallb.fullname" -}}
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
{{- define "metallb.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "metallb.labels" -}}
helm.sh/chart: {{ include "metallb.chart" . }}
{{ include "metallb.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "metallb.selectorLabels" -}}
app.kubernetes.io/name: {{ include "metallb.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "metallb.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "metallb.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper MetalLB namespace
*/}}
{{- define "metallb.namespace" -}}
{{- default .Values.namespace .Release.Namespace }}
{{- end }}

{{/*
Return true if any IP pool is enabled
*/}}
{{- define "metallb.ipPoolEnabled" -}}
{{- $enabled := false }}
{{- range $name, $pool := .Values.ipAddressPools }}
{{- if $pool.enabled }}
{{- $enabled = true }}
{{- end }}
{{- end }}
{{- $enabled }}
{{- end }}

{{/*
Return enabled IP pools
*/}}
{{- define "metallb.enabledIPPools" -}}
{{- $pools := dict }}
{{- range $name, $pool := .Values.ipAddressPools }}
{{- if $pool.enabled }}
{{- $_ := set $pools $name $pool }}
{{- end }}
{{- end }}
{{- $pools }}
{{- end }}

{{/*
Return IP pool name
*/}}
{{- define "metallb.ipPoolName" -}}
{{- if .pool.name }}
{{- .pool.name }}
{{- else }}
{{- .name }}
{{- end }}
{{- end }}

{{/*
Return true if L2 advertisement is enabled
*/}}
{{- define "metallb.l2AdvertisementEnabled" -}}
{{- if and .Values.l2Advertisement.enabled (eq (include "metallb.ipPoolEnabled" .) "true") -}}
true
{{- else -}}
false
{{- end -}}
{{- end }}

{{/*
Return true if BGP is enabled
*/}}
{{- define "metallb.bgpEnabled" -}}
{{- if and .Values.bgp.enabled .Values.bgpAdvertisement.enabled -}}
true
{{- else -}}
false
{{- end -}}
{{- end }}

{{/*
Return true if any BGP peer is enabled
*/}}
{{- define "metallb.bgpPeerEnabled" -}}
{{- $enabled := false }}
{{- if .Values.bgp.enabled }}
{{- range .Values.bgp.peers }}
{{- if .enabled }}
{{- $enabled = true }}
{{- end }}
{{- end }}
{{- end }}
{{- if $enabled -}}
true
{{- else -}}
false
{{- end -}}
{{- end }}

{{/*
Return true if monitoring is enabled
*/}}
{{- define "metallb.monitoringEnabled" -}}
{{- .Values.monitoring.enabled }}
{{- end }}

{{/*
Return true if network policy is enabled
*/}}
{{- define "metallb.networkPolicyEnabled" -}}
{{- .Values.networkPolicy.enabled }}
{{- end }}

{{/*
Create image pull secrets
*/}}
{{- define "metallb.imagePullSecrets" -}}
{{- if .Values.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}
