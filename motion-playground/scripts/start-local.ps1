[CmdletBinding()]
param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DistDir = Join-Path $ProjectDir "dist"
$RuntimeDir = Join-Path $ProjectDir ".local-runtime"
$ExportsDir = Join-Path $ProjectDir "exports"
$PidFile = Join-Path $RuntimeDir "server.pid"
$PortFile = Join-Path $RuntimeDir "server.port"
$LogFile = Join-Path $RuntimeDir "server.log"
$ErrorLogFile = Join-Path $RuntimeDir "server-error.log"
$ServerScript = Join-Path $ProjectDir "scripts\local_server.py"
$ServerHost = "127.0.0.1"

function Test-MotionServer {
    param([int]$Port)
    try {
        $health = Invoke-RestMethod -Uri "http://${ServerHost}:$Port/api/health" -TimeoutSec 1
        return $health.service -eq "motion-playground-export-server"
    }
    catch {
        return $false
    }
}

function Test-PortAvailable {
    param([int]$Port)
    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Loopback,
        $Port
    )
    try {
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        try { $listener.Stop() } catch {}
    }
}

function Quote-ProcessArgument {
    param([string]$Value)
    if ($Value -notmatch '[\s"]') {
        return $Value
    }
    if ($Value.Contains('"')) {
        throw "A project path containing a double quote is not supported."
    }
    return '"' + $Value + '"'
}

function Build-ApplicationIfNeeded {
    if (Test-Path (Join-Path $DistDir "index.html")) {
        return
    }

    Write-Host "Prebuilt web files were not found. Building the application..."
    $pnpm = Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue
    if (-not $pnpm) {
        $pnpm = Get-Command "pnpm" -ErrorAction SilentlyContinue
    }
    if (-not $pnpm) {
        throw "pnpm was not found. Install Node.js 20+ and run: corepack enable"
    }

    if (-not (Test-Path (Join-Path $ProjectDir "node_modules"))) {
        & $pnpm.Source --dir $ProjectDir install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) {
            throw "pnpm install failed."
        }
    }

    & $pnpm.Source --dir $ProjectDir build
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $DistDir "index.html"))) {
        throw "pnpm build failed."
    }
}

function Resolve-PythonCommand {
    $launcher = Get-Command "py.exe" -ErrorAction SilentlyContinue
    if ($launcher) {
        return @{
            FilePath = $launcher.Source
            Prefix = @("-3")
        }
    }

    $python = Get-Command "python.exe" -ErrorAction SilentlyContinue
    if (-not $python) {
        $python = Get-Command "python" -ErrorAction SilentlyContinue
    }
    if ($python) {
        return @{
            FilePath = $python.Source
            Prefix = @()
        }
    }

    throw "Python 3 was not found. Install it from https://www.python.org/downloads/windows/ and enable Add Python to PATH."
}

New-Item -ItemType Directory -Force -Path $RuntimeDir, $ExportsDir | Out-Null
Build-ApplicationIfNeeded

if (-not (Test-Path $ServerScript)) {
    throw "Local server script is missing: $ServerScript"
}

if (Test-Path $PortFile) {
    $savedPort = 0
    [void][int]::TryParse((Get-Content $PortFile -Raw).Trim(), [ref]$savedPort)
    if ($savedPort -gt 0 -and (Test-MotionServer -Port $savedPort)) {
        $serverUrl = "http://${ServerHost}:$savedPort/"
        Write-Host "Motion Playground is already running: $serverUrl"
        if (-not $NoBrowser) {
            Start-Process $serverUrl
        }
        exit 0
    }
}

foreach ($existingPort in 4173..4183) {
    if (Test-MotionServer -Port $existingPort) {
        Set-Content -Path $PortFile -Value $existingPort -Encoding ASCII
        $serverUrl = "http://${ServerHost}:$existingPort/"
        Write-Host "Motion Playground is already running: $serverUrl"
        if (-not $NoBrowser) {
            Start-Process $serverUrl
        }
        exit 0
    }
}

$serverPort = 0
foreach ($candidate in 4173..4183) {
    if (Test-PortAvailable -Port $candidate) {
        $serverPort = $candidate
        break
    }
}
if ($serverPort -eq 0) {
    throw "Ports 4173-4183 are in use. Close one of those applications and try again."
}

$pythonCommand = Resolve-PythonCommand
$arguments = @()
$arguments += $pythonCommand.Prefix
$arguments += @(
    $ServerScript,
    "--host", $ServerHost,
    "--port", "$serverPort",
    "--directory", $DistDir,
    "--exports", $ExportsDir
)
$argumentLine = ($arguments | ForEach-Object { Quote-ProcessArgument -Value "$_" }) -join " "

Remove-Item $LogFile, $ErrorLogFile -Force -ErrorAction SilentlyContinue
$serverProcess = Start-Process `
    -FilePath $pythonCommand.FilePath `
    -ArgumentList $argumentLine `
    -WorkingDirectory $ProjectDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError $ErrorLogFile `
    -PassThru

Set-Content -Path $PidFile -Value $serverProcess.Id -Encoding ASCII
Set-Content -Path $PortFile -Value $serverPort -Encoding ASCII

$serverReady = $false
foreach ($attempt in 1..50) {
    if (Test-MotionServer -Port $serverPort) {
        $serverReady = $true
        break
    }
    Start-Sleep -Milliseconds 200
}

if (-not $serverReady) {
    try { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
    $errorDetails = ""
    if (Test-Path $ErrorLogFile) {
        $errorDetails = (Get-Content $ErrorLogFile -Raw).Trim()
    }
    throw "Local server failed to start. $errorDetails"
}

$serverUrl = "http://${ServerHost}:$serverPort/"
Write-Host "Motion Playground started: $serverUrl"
Write-Host "Transparent exports: $ExportsDir"
if (-not $NoBrowser) {
    Start-Process $serverUrl
}
exit 0
