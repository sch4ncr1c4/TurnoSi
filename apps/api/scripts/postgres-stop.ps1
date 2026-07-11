$ErrorActionPreference = "Stop"

$installDir = "C:\PostgreSQL\17"
$dataDir = Join-Path $installDir "data"
$pgCtl = Join-Path $installDir "bin\pg_ctl.exe"

& $pgCtl -D $dataDir stop
