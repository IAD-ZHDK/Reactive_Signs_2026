#Requires -Version 5.1
# Discards local changes to tracked files except tracker settings, and syncs
# with origin/main. Git may remove untracked files that obstruct tracked paths.
param([switch]$Force)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repositoryRoot

if (-not $Force) {
    Write-Host "This overwrites local tracked changes with origin/main, except tracker settings."
    Write-Host "Untracked files that obstruct tracked paths may also be removed."
    Write-Host "Close the tracker before updating."
    $answer = Read-Host "Continue? (y/N)"
    if ($answer -notmatch '^[yY]') { Write-Host "Aborted."; exit 1 }
}

git fetch origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$settingsPath = Join-Path $repositoryRoot "realSenseTrackerOSC/data/lowHigh.csv"
$backupPath = $null
if (Test-Path -LiteralPath $settingsPath) {
    if (-not (Test-Path -LiteralPath $settingsPath -PathType Leaf)) {
        throw "Tracker settings path is not a file: $settingsPath"
    }
    $backupPath = Join-Path ([System.IO.Path]::GetTempPath()) "tracker-settings-$([guid]::NewGuid().ToString('N')).csv"
    Copy-Item -LiteralPath $settingsPath -Destination $backupPath -ErrorAction Stop
}

try {
    git checkout --force main
    if ($LASTEXITCODE -ne 0) { throw "Could not switch to main (git exit code $LASTEXITCODE)." }

    git reset --hard origin/main
    if ($LASTEXITCODE -ne 0) { throw "Could not update from origin/main (git exit code $LASTEXITCODE)." }
}
finally {
    if ($backupPath) {
        try {
            $settingsDirectory = Split-Path -Parent $settingsPath
            New-Item -ItemType Directory -Path $settingsDirectory -Force | Out-Null
            Copy-Item -LiteralPath $backupPath -Destination $settingsPath -Force -ErrorAction Stop
        }
        catch {
            throw "Could not restore tracker settings. The backup is at $backupPath. $($_.Exception.Message)"
        }
        Remove-Item -LiteralPath $backupPath -Force -ErrorAction Stop
    }
}

Write-Host "Updated to origin/main. Existing tracker settings were preserved."
