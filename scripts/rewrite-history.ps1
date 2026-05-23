# Rebuild main as 18 milestone commits from archive tag (tree-preserving).
$ErrorActionPreference = "Stop"
$ArchiveTag = "archive/history-pre-rewrite-2026-05-24"
$BackupBranch = "backup/pre-rewrite-main"
$GroupsFile = Join-Path $PSScriptRoot "rewrite-groups.txt"

if (-not (git rev-parse $ArchiveTag 2>$null)) { throw "Missing tag: $ArchiveTag" }
git branch -f $BackupBranch $ArchiveTag | Out-Null

$lines = Get-Content -Path $GroupsFile -Encoding UTF8 | Where-Object { $_.Trim() -ne "" }
$parent = $null
foreach ($line in $lines) {
  $parts = $line.Split("|", 2)
  $end = $parts[0].Trim()
  $msg = $parts[1].Trim()
  $tree = (git rev-parse "${end}^{tree}").Trim()
  if (-not $parent) {
    $parent = (git commit-tree $tree -m $msg).Trim()
  } else {
    $parent = (git commit-tree $tree -p $parent -m $msg).Trim()
  }
}

$archiveTree = (git rev-parse "${ArchiveTag}^{tree}").Trim()
$rewriteTree = (git rev-parse "${parent}^{tree}").Trim()
if ($archiveTree -ne $rewriteTree) {
  throw "Tree mismatch: archive=$archiveTree rewrite=$rewriteTree"
}

git checkout -B main $parent | Out-Null
Write-Host "Rewrote main to $parent ($(git rev-list --count main) commits)"
