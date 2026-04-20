@echo off
echo ╔══════════════════════════════════════╗
echo ║     BeSap Digital Planner            ║
echo ╚══════════════════════════════════════╝
echo.
echo Démarrage en cours...
docker-compose up --build -d
echo.
echo Patientez 5 secondes...
timeout /t 5 /nobreak > nul
echo.
echo Ouverture du navigateur...
start http://localhost
echo.
echo ✓ Le planner est disponible sur http://localhost
echo   Pour arrêter : double-cliquez sur stop.bat
echo.
pause
