@echo off
:: Starts the Hermes local server with its system-tray icon. Launched at login by
:: run-hidden.vbs via Windows Task Scheduler. tray.js serves the built React app
:: (../dist) + the API on http://localhost:4317 and shows the tray icon. Run
:: "npm run build" in hermes/ at least once first.
setlocal
set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%tray.js"
