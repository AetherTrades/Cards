@echo off
echo Running build-cards-json.js...

:: Navigate to the script's directory (in case it's run from elsewhere)
cd /d "%~dp0"

:: Optional: install dependencies (uncomment if you want to ensure they exist)
:: npm install papaparse node-fetch@2 >nul 2>&1

:: Run the Node script
node build-cards-json.js

echo.
echo ✅ Done! Press any key to exit...
pause >nul
