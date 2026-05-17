@echo off
cd /d "%~dp0"
python -m PyInstaller --onefile --clean --name EarthquakeAlertSound obs-alert-sound.py
echo.
echo Built: dist\EarthquakeAlertSound.exe
pause
