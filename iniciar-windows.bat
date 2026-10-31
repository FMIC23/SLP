@echo off
REM Doble clic para abrir el Entrenador C1 / SLP 3 en local (requiere Node.js 20+)
cd /d "%~dp0"
call npm run local
pause
