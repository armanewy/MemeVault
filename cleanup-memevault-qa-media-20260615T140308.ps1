$ErrorActionPreference = 'Stop'

$targets = @(
  'C:\MemeVault-QA-Media-20260615T140308',
  'D:\MemeVault-QA-Media-20260615T140308'
)

foreach ($target in $targets) {
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
    Write-Host "Removed $target"
  } else {
    Write-Host "Already missing $target"
  }
}
