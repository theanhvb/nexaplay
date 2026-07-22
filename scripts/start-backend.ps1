param(
  [switch]$ResetCredential
)

$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $workspace '.runtime'
$configPath = Join-Path $runtimeDirectory 'postgres.local.json'
$credentialPath = Join-Path $runtimeDirectory 'postgres.credential'

New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

if ($ResetCredential) {
  Remove-Item -LiteralPath $configPath, $credentialPath -Force -ErrorAction SilentlyContinue
  Write-Host 'Saved PostgreSQL configuration was cleared.' -ForegroundColor Yellow
}

$config = $null
if ((Test-Path -LiteralPath $configPath) -and (Test-Path -LiteralPath $credentialPath)) {
  try {
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    $securePassword = Get-Content -LiteralPath $credentialPath -Raw | ConvertTo-SecureString
  } catch {
    Write-Warning 'Saved PostgreSQL configuration is invalid and will be recreated.'
    $config = $null
  }
}

if (-not $config) {
  $pgHost = Read-Host 'PostgreSQL host (Enter = localhost)'
  if ([string]::IsNullOrWhiteSpace($pgHost)) { $pgHost = 'localhost' }

  $pgPort = Read-Host 'PostgreSQL port (Enter = 5432)'
  if ([string]::IsNullOrWhiteSpace($pgPort)) { $pgPort = '5432' }

  $pgUser = Read-Host 'PostgreSQL username (Enter = postgres)'
  if ([string]::IsNullOrWhiteSpace($pgUser)) { $pgUser = 'postgres' }

  $passwordInput = Read-Host 'PostgreSQL password (Enter = local default)'
  if ([string]::IsNullOrWhiteSpace($passwordInput)) { $passwordInput = '12345' }
  $securePassword = ConvertTo-SecureString $passwordInput -AsPlainText -Force
  $config = [pscustomobject]@{ host = $pgHost; port = $pgPort; user = $pgUser }
  $config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
  $securePassword | ConvertFrom-SecureString | Set-Content -LiteralPath $credentialPath -Encoding UTF8
  Write-Host 'PostgreSQL configuration saved securely for this Windows account.' -ForegroundColor Green
}

$plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
$env:PGHOST = [string]$config.host
$env:PGPORT = [string]$config.port
$env:PGUSER = [string]$config.user
$env:PGPASSWORD = $plainPassword

Set-Location -LiteralPath $workspace
Write-Host ''
Write-Host "Starting backend with PostgreSQL at $($config.host):$($config.port) as $($config.user)..." -ForegroundColor Cyan
Write-Host 'Saved credential will be reused automatically. Press Ctrl+C to stop.' -ForegroundColor DarkGray
npm run dev:backend
