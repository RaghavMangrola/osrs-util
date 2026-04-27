@echo off
:: Loads BANK_WORKER_URL and BANK_AUTH_SECRET from .env in the same directory,
:: then starts the bank sync watcher.
setlocal

set "SCRIPT_DIR=%~dp0"

if not exist "%SCRIPT_DIR%.env" (
  echo ERROR: %SCRIPT_DIR%.env not found. Copy .env.example and fill it in.
  exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%SCRIPT_DIR%.env") do (
  if not "%%A"=="" set "%%A=%%B"
)

node "%SCRIPT_DIR%sync.js"
