# Install only geo-platform-ranking-sampling for Hermes standalone testing.
param(
  [string]$TargetRoot = ""
)

$ErrorActionPreference = "Stop"
$SkillRoot = Split-Path $PSScriptRoot -Parent

if ($TargetRoot -eq "") {
  $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
  $TargetRoot = Join-Path $localAppData "hermes\skills"
}

$dest = Join-Path $TargetRoot "geo-platform-ranking-sampling"
Write-Host "Installing skill to: $dest"

if (Test-Path $dest) {
  Remove-Item -Recurse -Force $dest
}

$exclude = @("scripts")
Get-ChildItem -Path $SkillRoot -Exclude $exclude | ForEach-Object {
  Copy-Item -Recurse -Force $_.FullName -Destination $dest
}

Write-Host "Done. Restart Hermes Gateway. See HERMES_TEST.md for test steps."
