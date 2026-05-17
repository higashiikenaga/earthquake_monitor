# OBS alert sound capture

`EarthquakeAlertSound.exe` is a small local sound app for OBS.

The browser app normally plays alert tones inside the browser. If OBS captures
the browser's application audio, unrelated browser audio such as YouTube can be
captured too. This helper moves only earthquake alert tones into a separate
Python process.

## Usage

1. Start the helper:

   ```powershell
   .\dist\EarthquakeAlertSound.exe
   ```

   Or double-click `start_obs_alert_sound.bat`.

2. In the earthquake monitor page, enable:

   - `通知音を鳴らす`
   - `OBS向け専用音声アプリを使う`

3. In OBS, add or configure Application Audio Capture and select
   `EarthquakeAlertSound.exe`.

4. Do not capture the browser audio if you want to avoid YouTube or other tab
   audio.

The helper listens only on `127.0.0.1:18765` and accepts:

```text
POST http://127.0.0.1:18765/play
```

The browser sends the same tone pattern it would normally play with Web Audio.
If the helper is not running while external sound is enabled, the browser does
not play a fallback tone; it shows a local notice instead.

## Rebuild the EXE

If you edit `obs-alert-sound.py`, rebuild the executable with:

```powershell
python -m PyInstaller --onefile --clean --name EarthquakeAlertSound obs-alert-sound.py
```

Or double-click `build_obs_alert_sound_exe.bat`.
