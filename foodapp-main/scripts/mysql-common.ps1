$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $current = [System.Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($current)) {
    return $current.Trim()
  }

  $projectRoot = Resolve-Path "$PSScriptRoot\.."
  $envPath = Join-Path $projectRoot ".env"
  if (-not (Test-Path $envPath)) {
    return $null
  }

  $line = Get-Content $envPath | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = ($line -replace "^\s*$Name\s*=\s*", "").Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value
}

function Get-DatabaseConfig {
  $databaseUrl = Get-EnvValue -Name "DATABASE_URL"
  if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "DATABASE_URL is not set. Add it to .env (example: mysql://foodapp:foodapp@localhost:3306/foodapp)."
  }

  $uri = [System.Uri]::new($databaseUrl)
  if ($uri.Scheme -ne "mysql") {
    throw "Only mysql:// DATABASE_URL values are supported. Current value: $databaseUrl"
  }

  $userInfoParts = $uri.UserInfo.Split(":", 2)
  $dbUser = if ($userInfoParts.Length -gt 0) { [System.Uri]::UnescapeDataString($userInfoParts[0]) } else { "" }
  $dbPassword = if ($userInfoParts.Length -gt 1) { [System.Uri]::UnescapeDataString($userInfoParts[1]) } else { "" }

  if ([string]::IsNullOrWhiteSpace($dbUser)) {
    throw "DATABASE_URL is missing username."
  }

  $dbName = $uri.AbsolutePath.TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($dbName)) {
    throw "DATABASE_URL is missing database name."
  }

  $dbPort = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }

  return @{
    Host = $uri.Host
    Port = $dbPort
    User = $dbUser
    Password = $dbPassword
    Database = $dbName
    RootUser = (Get-EnvValue -Name "DB_ROOT_USER")
    RootPassword = (Get-EnvValue -Name "DB_ROOT_PASSWORD")
  }
}

function Find-MySqlCli {
  $cmd = Get-Command mysql -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidatePaths = @(
    "$env:ProgramFiles\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "$env:ProgramFiles\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "$env:ProgramFiles\MySQL\MySQL Server 8.3\bin\mysql.exe",
    "$env:ProgramFiles\MySQL\MySQL Server 8.2\bin\mysql.exe",
    "$env:ProgramFiles\MySQL\MySQL Server 8.1\bin\mysql.exe",
    "$env:ProgramFiles\MySQL\MySQL Server 8.0\bin\mysql.exe"
  )

  foreach ($candidate in $candidatePaths) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  $searchRoots = @(
    "$env:ProgramFiles\MySQL",
    "${env:ProgramFiles(x86)}\MySQL"
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path $_) }

  foreach ($root in $searchRoots) {
    $found = Get-ChildItem -Path $root -Recurse -File -Filter mysql.exe -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($found) {
      return $found.FullName
    }
  }

  throw "mysql CLI was not found. Install MySQL Server/Client and ensure mysql.exe is available in PATH."
}

function Build-MySqlArgs {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Config,
    [Parameter(Mandatory = $true)]
    [string]$User,
    [string]$Password,
    [string]$Database
  )

  $args = @(
    "--default-character-set=utf8mb4",
    "--host=$($Config.Host)",
    "--port=$($Config.Port)",
    "--user=$User"
  )

  if (-not [string]::IsNullOrEmpty($Password)) {
    $args += "--password=$Password"
  }

  if (-not [string]::IsNullOrWhiteSpace($Database)) {
    $args += $Database
  }

  return $args
}
