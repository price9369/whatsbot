@echo off
setlocal enabledelayedexpansion

set ROOT=%~dp0

REM ================================
REM Minimised background windows:
REM /min flag (start) window ko minimize karta hai.
REM ================================

start "Hospital-Bot" /min cmd /k "cd /d !ROOT!hospital-bot && npm run start:all"
start "Hospital-Admin" /min cmd /k "cd /d !ROOT!hospital-admin && npm run dev -- --host 127.0.0.1 --port 5173"

echo Started in background.
echo UI   : http://localhost:5000/
echo Admin: http://127.0.0.1:5173

REM pause hata diya taaki window unblock ho.
REM agar aap chaho to niche ki line uncomment kar do.
REM pause

