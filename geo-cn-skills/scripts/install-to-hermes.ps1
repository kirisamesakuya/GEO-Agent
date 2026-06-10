# Install geo-cn-skills into local Hermes skills directory.
# Usage: .\scripts\install-to-hermes.ps1 [-HermesSkillsRoot "C:\path\to\skills\geo"]

param(
  [string]$HermesSkillsRoot = ""
)

$ErrorActionPreference = "Stop"
$PackRoot = Split-Path $PSScriptRoot -Parent
$SkillsSource = Join-Path $PackRoot "skills"
$SharedSource = Join-Path $PackRoot "shared"

if ($HermesSkillsRoot -eq "") {
  $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
  $HermesSkillsRoot = Join-Path $localAppData "hermes\skills\geo-cn"
}

Write-Host "Pack: $PackRoot"
Write-Host "Target: $HermesSkillsRoot"

New-Item -ItemType Directory -Force -Path $HermesSkillsRoot | Out-Null

# Copy each skill folder
Get-ChildItem -Path $SkillsSource -Directory | ForEach-Object {
  $dest = Join-Path $HermesSkillsRoot $_.Name
  Write-Host "Copy skill: $($_.Name) -> $dest"
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Copy-Item -Recurse -Force $_.FullName $dest
}

# Copy shared references into pack root for Hermes relative reads
$sharedDest = Join-Path $HermesSkillsRoot "_shared"
if (Test-Path $sharedDest) { Remove-Item -Recurse -Force $sharedDest }
Copy-Item -Recurse -Force $SharedSource $sharedDest

Write-Host "Done. Restart Hermes Gateway if skills list is cached."
Write-Host "GEO-Agent: merge adapter-skill-map.json into skill_routes config."
