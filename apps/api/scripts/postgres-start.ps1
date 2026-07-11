$ErrorActionPreference = "Stop"

$installDir = "C:\PostgreSQL\17"
$dataDir = Join-Path $installDir "data"
$logFile = Join-Path $installDir "postgresql.log"
$pgCtl = Join-Path $installDir "bin\pg_ctl.exe"

& $pgCtl -D $dataDir -l $logFile start
