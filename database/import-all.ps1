$ErrorActionPreference = 'Stop'
$connection = @{
  '01_identity.sql' = 'identity_db'
  '02_catalog.sql' = 'catalog_db'
  '03_engagement.sql' = 'engagement_db'
  '04_review.sql' = 'review_db'
  '05_billing.sql' = 'billing_db'
  '06_notification.sql' = 'notification_db'
  '07_analytics.sql' = 'analytics_db'
}

Write-Host 'Create databases first with database/00_pgadmin_create_databases.sql.'
foreach ($item in $connection.GetEnumerator() | Sort-Object Name) {
  $path = Join-Path $PSScriptRoot $item.Key
  Write-Host "Importing $($item.Key) into $($item.Value)"
  & psql -v ON_ERROR_STOP=1 -U postgres -h localhost -d $item.Value -f $path
  if ($LASTEXITCODE -ne 0) { throw "Import failed: $($item.Key)" }
}
Write-Host 'All microservice databases were imported successfully.'
