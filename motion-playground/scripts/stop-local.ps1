[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$RuntimeDir = Join-Path $ProjectDir ".local-runtime"
$PidFile = Join-Path $RuntimeDir "server.pid"
$PortFile = Join-Path $RuntimeDir "server.port"

$serverPid = 0
if (Test-Path $PidFile) {
    [void][int]::TryParse((Get-Content $PidFile -Raw).Trim(), [ref]$serverPid)
}

$stopped = $false
if ($serverPid -gt 0) {
    $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
    if ($process) {
        $belongsToMotionPlayground = $false
        try {
            $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $serverPid"
            $commandLine = "$($processInfo.CommandLine)"
            $belongsToMotionPlayground = (
                $commandLine -like "*local_server.py*" -and
                $commandLine -like "*$ProjectDir*"
            )
        }
        catch {
            $belongsToMotionPlayground = $false
        }

        if ($belongsToMotionPlayground) {
            Stop-Process -Id $serverPid -Force
            $stopped = $true
        }
        else {
            Write-Warning "The saved process ID does not belong to Motion Playground; it was not stopped."
        }
    }
}

Remove-Item $PidFile, $PortFile -Force -ErrorAction SilentlyContinue

if ($stopped) {
    Write-Host "Motion Playground local server stopped."
}
else {
    Write-Host "No running Motion Playground server was found."
}

exit 0
