$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

. "$PSScriptRoot\mysql-common.ps1"

$projectRoot = Resolve-Path "$PSScriptRoot\.."
$migrationDir = Join-Path $projectRoot "db\migrations"
$config = Get-DatabaseConfig
$mysqlExe = Find-MySqlCli
$mysqlArgs = Build-MySqlArgs -Config $config -User $config.User -Password $config.Password -Database $config.Database

Write-Host "Applying SQL migrations from $migrationDir"
Write-Host "Target DB: $($config.User)@$($config.Host):$($config.Port)/$($config.Database)"

$migrations = Get-ChildItem -Path $migrationDir -Filter *.sql | Sort-Object Name
if (-not $migrations) {
  Write-Host "No migration files found."
  exit 0
}

foreach ($file in $migrations) {
  Write-Host "Running migration: $($file.Name)"
  Get-Content -Raw $file.FullName | & $mysqlExe @mysqlArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Migration failed: $($file.Name)"
  }
}

Write-Host "Migrations completed."
