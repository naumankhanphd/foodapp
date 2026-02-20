$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

. "$PSScriptRoot\mysql-common.ps1"

$projectRoot = Resolve-Path "$PSScriptRoot\.."
$seedDir = Join-Path $projectRoot "db\seed"
$config = Get-DatabaseConfig
$mysqlExe = Find-MySqlCli
$mysqlArgs = Build-MySqlArgs -Config $config -User $config.User -Password $config.Password -Database $config.Database

Write-Host "Applying seed SQL from $seedDir"
Write-Host "Target DB: $($config.User)@$($config.Host):$($config.Port)/$($config.Database)"

$seedFiles = Get-ChildItem -Path $seedDir -Filter *.sql | Sort-Object Name
if (-not $seedFiles) {
  Write-Host "No seed files found."
  exit 0
}

foreach ($file in $seedFiles) {
  Write-Host "Running seed: $($file.Name)"
  Get-Content -Raw $file.FullName | & $mysqlExe @mysqlArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Seed failed: $($file.Name)"
  }
}

Write-Host "Seeding completed."
