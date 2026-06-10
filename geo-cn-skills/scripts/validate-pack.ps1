# Validate geo-cn-skills pack structure
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Registry = Get-Content (Join-Path $Root "registry\skills.json") -Raw | ConvertFrom-Json
$Errors = @()

foreach ($skill in $Registry.skills) {
  $skillDir = Join-Path $Root "skills\$($skill.id)"
  $skillMd = Join-Path $skillDir "SKILL.md"
  $manifest = Join-Path $skillDir "manifest.json"
  if (-not (Test-Path $skillMd)) { $Errors += "Missing SKILL.md: $($skill.id)" }
  if (-not (Test-Path $manifest)) { $Errors += "Missing manifest.json: $($skill.id)" }
}

$requiredShared = @(
  "shared\cn-defaults.json",
  "shared\geo-web-contract.md",
  "adapter-skill-map.json"
)
foreach ($rel in $requiredShared) {
  if (-not (Test-Path (Join-Path $Root $rel))) { $Errors += "Missing $rel" }
}

if ($Errors.Count -gt 0) {
  Write-Host "VALIDATION FAILED:"
  $Errors | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

Write-Host "OK: $($Registry.skills.Count) skills, version $(Get-Content (Join-Path $Root VERSION))"
exit 0
