@echo off
cd /d "%~dp0"
if exist "dist\EarthquakeAlertSound.exe" (
  "dist\EarthquakeAlertSound.exe"
) else (
  python obs-alert-sound.py
)
pause
