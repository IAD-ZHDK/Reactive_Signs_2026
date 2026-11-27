@echo off
REM ============================================================
REM Reactive Signs 2026 - exhibition launcher (Windows kiosk)
REM Double-click this file. It runs from wherever the repo sits
REM (no hardcoded paths), starts the RealSense tracker, serves
REM the exhibition, and opens Chrome full-screen.
REM ============================================================

REM Run from the repository root, one level above this script.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%"

set PORT=8000

echo starting...
echo closing open applications gracefully...

REM Close Chrome gracefully first (avoids the "didn't shut down" popup).
taskkill /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

REM Force kill anything still running from a previous session.
TASKKILL /F /IM chrome.exe >nul 2>&1
TASKKILL /F /IM python.exe >nul 2>&1
TASKKILL /F /IM node.exe >nul 2>&1

set "MONITOR_COUNT=1"
set "RIGHT_X=0"
set "RIGHT_Y=0"
set "RIGHT_WIDTH=1920"
set "RIGHT_HEIGHT=1080"
set "TRACKER_ARGS="
for /f "tokens=1-5 delims=," %%A in ('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $screens = @([System.Windows.Forms.Screen]::AllScreens | Sort-Object { $_.Bounds.X }, { $_.Bounds.Y }); $right = $screens[-1].Bounds; Write-Output ('{0},{1},{2},{3},{4}' -f $screens.Count, $right.X, $right.Y, $right.Width, $right.Height)"') do (
  set "MONITOR_COUNT=%%A"
  set "RIGHT_X=%%B"
  set "RIGHT_Y=%%C"
  set "RIGHT_WIDTH=%%D"
  set "RIGHT_HEIGHT=%%E"
)

if %MONITOR_COUNT% GTR 1 set "TRACKER_ARGS=--fullscreen --monitor left"

echo starting the RealSense tracker (realSenseTrackerOSC)
REM run.bat creates the .venv and installs requirements on first run,
REM then streams OSC on ws://localhost:8025/.
start /min "" cmd /d /c "cd /d ""%REPO_ROOT%\realSenseTrackerOSC"" && call run.bat %TRACKER_ARGS%"
echo tracker starting in background

TIMEOUT /t 10

echo npm version:
CMD /C npm --version

echo ensure that the port is free
CMD /C npx kill-port --port %PORT%
TIMEOUT /t 2

echo starting http-server in background on port %PORT%
start /min "" cmd /d /c "cd /d ""%REPO_ROOT%\2026_Exhibition"" && npx http-server -p %PORT% -c-1"

TIMEOUT /t 5

echo starting Chrome in kiosk mode
start "" chrome --start-fullscreen ^
  --window-position=%RIGHT_X%,%RIGHT_Y% ^
  --window-size=%RIGHT_WIDTH%,%RIGHT_HEIGHT% ^
  "http://localhost:%PORT%/?presentation=1" ^
  --no-first-run ^
  --no-default-browser-check ^
  --no-pings ^
  --no-service-autorun ^
  --disable-background-networking ^
  --disable-breakpad ^
  --disable-client-side-phishing-detection ^
  --disable-component-extensions-with-background-pages ^
  --disable-component-update ^
  --disable-default-apps ^
  --disable-device-discovery-notifications ^
  --disable-extensions ^
  --disable-features=InterestFeedContentSuggestions ^
  --disable-geolocation ^
  --disable-preconnect ^
  --disable-sync ^
  --no-crash-upload ^
  --disable-session-crashed-bubble ^
  --disable-infobars ^
  --disable-restore-session-state ^
  --disk-cache-dir=nul

echo.
echo ============================================
echo All services started.
echo ============================================
echo - RealSense tracker: running in background (OSC ws://localhost:8025/)
echo - HTTP server:       http://localhost:%PORT%
echo - Chrome:            full-screen kiosk
echo.
echo Presentation keys (in Chrome): arrow keys switch posters, 1-9 jump to a team.
echo Close this window to stop the launcher; use Alt+F4 to exit Chrome.
echo ============================================
pause
