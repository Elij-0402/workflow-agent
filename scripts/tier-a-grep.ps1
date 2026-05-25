# Tier A visual grep gate (Phase 5 — D-11)
# Exit 0 when only sessions/[id]/page.tsx has legacy text-[Npx]; exit 1 on workbench/list/upload.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$paths = @(
  "src/app/(app)/sessions/page.tsx",
  "src/app/(app)/sessions/SessionsClient.tsx",
  "src/app/(app)/sessions/[id]/workbench/workbench-client.tsx",
  "src/app/(app)/upload/page.tsx",
  "src/app/(app)/sessions/[id]/page.tsx"
)

$pxPattern = 'text-\[[0-9]+px\]'
$primaryPattern = 'text-primary'

function Count-Matches([string]$relPath, [string]$pattern) {
  $full = Join-Path $root $relPath
  if (-not (Test-Path -LiteralPath $full)) { return 0 }
  $hits = Select-String -LiteralPath $full -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue
  if ($null -eq $hits) { return 0 }
  return @($hits).Count
}

$fail = $false
$overviewPx = Count-Matches "src/app/(app)/sessions/[id]/page.tsx" $pxPattern

foreach ($rel in $paths) {
  if ($rel -eq "src/app/(app)/sessions/[id]/page.tsx") { continue }
  $px = Count-Matches $rel $pxPattern
  if ($px -gt 0) {
    Write-Host "FAIL: $rel has $px text-[Npx] match(es)" -ForegroundColor Red
    $fail = $true
  }
}

foreach ($rel in @(
  "src/app/(app)/sessions/page.tsx",
  "src/app/(app)/sessions/SessionsClient.tsx",
  "src/app/(app)/sessions/[id]/workbench/workbench-client.tsx",
  "src/app/(app)/upload/page.tsx"
)) {
  $dec = Count-Matches $rel $primaryPattern
  if ($dec -gt 0) {
    Write-Host "WARN: $rel has $dec decorative text-primary (review manually)" -ForegroundColor Yellow
  }
}

if ($fail) {
  exit 1
}

if ($overviewPx -gt 0) {
  Write-Host "BASELINE_DEBT: sessions/[id]/page.tsx has $overviewPx text-[Npx] (pre-Phase-5 allowlist)"
}

Write-Host "Tier A grep: PASS (no new px on workbench/sessions list/upload)"
exit 0
