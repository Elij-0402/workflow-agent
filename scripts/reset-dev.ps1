# Stop stray Next dev processes, clear .next, restart on port 3000.
$ErrorActionPreference = "SilentlyContinue"
Get-NetTCPConnection -LocalPort 3000,3001 | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force
}
Get-Process node | Stop-Process -Force
Start-Sleep -Seconds 1
if (Test-Path .next) {
  Remove-Item -Recurse -Force .next
}
Write-Host "Starting dev server (webpack). Hard-refresh the browser (Ctrl+Shift+R) after it is ready."
npm run dev
