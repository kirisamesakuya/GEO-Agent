# 将 docs/协议 下 6 份 Markdown 协议导入飞书云文档（Markdown 原生转换，避免 Word 格式错乱）
# 前置：lark-cli config init 完成且 lark-cli auth login 已登录

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$agreementDir = Join-Path $root 'docs\协议'

$files = @(
  '汇智GEO-AI智联项目平台_用户服务协议.md',
  '汇智GEO-AI智联项目平台_隐私政策.md',
  '汇智GEO-AI智联项目平台_投放服务预存与资金管理办法.md',
  '汇智AIGC媒体收单平台_用户服务协议.md',
  '汇智AIGC媒体收单平台_接单方入驻与平台撮合服务协议.md',
  '汇智AIGC媒体收单平台_隐私政策.md'
)

Write-Host '检查飞书登录状态...'
$status = lark-cli auth status 2>&1 | Out-String
if ($status -notmatch '"ok"\s*:\s*true') {
  Write-Host $status
  throw '飞书未登录。请先执行: lark-cli config init --new ; lark-cli auth login --recommend'
}

$created = @()
foreach ($name in $files) {
  $path = Join-Path $agreementDir $name
  if (-not (Test-Path $path)) { throw "文件不存在: $path" }
  $atPath = "@docs/协议/$name"
  Write-Host "创建云文档: $name"
  $out = lark-cli docs +create --api-version v2 --as user --doc-format markdown --parent-position my_library --content $atPath 2>&1 | Out-String
  if ($out -notmatch '"ok"\s*:\s*true') {
    Write-Host $out
    throw "创建失败: $name"
  }
  $url = [regex]::Match($out, '"url"\s*:\s*"([^"]+)"').Groups[1].Value
  $created += [pscustomobject]@{ Name = $name; Url = $url }
  Start-Sleep -Seconds 1
}

Write-Host ''
Write-Host '=== 已创建飞书云文档 ==='
$created | Format-Table -AutoSize
