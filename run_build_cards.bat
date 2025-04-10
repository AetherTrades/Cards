@echo off
TITLE Build Scryfall Card Data

echo Running build-cards-json.js to download/process Scryfall data...
echo This might take a few minutes depending on download speed and processing.
echo Please wait...
echo.

REM Ensure Node.js is installed and in your system's PATH

REM Delete the .cache\default-cards.json (if it exists)
if exist ".cache\default-cards.json" (
    echo Deleting .cache\default-cards.json...
    del ".cache\default-cards.json"
) else (
    echo .cache\default-cards.json not found, skipping deletion.
)

REM Delete the data\unmatched_cards.json (if it exists)
if exist "data\unmatched_cards.json" (
    echo Deleting data\unmatched_cards.json...
    del "data\unmatched_cards.json"
) else (
    echo data\unmatched_cards.json not found, skipping deletion.
)

node build-cards-json.js

echo.
echo Script execution finished. Check the console output above for details or errors.
echo The output file should be in the 'data' subfolder (./data/cards.json).

echo.
pause