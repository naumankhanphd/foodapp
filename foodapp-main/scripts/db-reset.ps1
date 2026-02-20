$ErrorActionPreference = "Stop"

. "$PSScriptRoot\mysql-common.ps1"

$config = Get-DatabaseConfig
$mysqlExe = Find-MySqlCli

$rootUser = if ([string]::IsNullOrWhiteSpace($config.RootUser)) { "root" } else { $config.RootUser }
$rootPassword = if ($null -eq $config.RootPassword) { "root" } else { $config.RootPassword }

$mysqlArgs = Build-MySqlArgs -Config $config -User $rootUser -Password $rootPassword -Database ""

$dbNameQuoted = $config.Database.Replace("`", "``")
$resetSql = @"
DROP DATABASE IF EXISTS ``$dbNameQuoted``;
CREATE DATABASE ``$dbNameQuoted`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"@

Write-Host "Resetting database '$($config.Database)' with $rootUser@$($config.Host):$($config.Port)..."
$resetSql | & $mysqlExe @mysqlArgs
if ($LASTEXITCODE -ne 0) {
  throw "Database reset failed."
}

Write-Host "Database reset completed."
