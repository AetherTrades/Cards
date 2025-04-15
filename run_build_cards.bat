@echo off
TITLE Build MTG Card Data JSON

echo Running build-cards-json.js to process CSV and fetch Scryfall data...
echo This might take a few minutes depending on your collection size and network speed.
echo Please wait...
echo.

REM Ensure Node.js is installed and in your system's PATH

REM --- Optional Cleanup ---
REM Delete the data\unmatched_cards.log (if it exists from a previous run)
if exist "data\unmatched_cards.log" (
    echo Deleting old data\unmatched_cards.log...
    del "data\unmatched_cards.log" > nul
) else (
    echo data\unmatched_cards.log not found, skipping deletion.
)
echo.

REM --- Run the Node.js Build Script ---
REM Make sure this .bat file is in the same directory as build-cards-json.js
REM Or provide the full path to the script, e.g., node "C:\path\to\your\project\build-cards-json.js"
node build-cards-json.js

REM Check if the Node script ran successfully
if %errorlevel% neq 0 (
    echo.
    echo ****************************************
    echo * ERROR: Node script failed!           *
    echo * Check console output above for errors. *
    echo ****************************************
) else (
    echo.
    echo Script execution finished successfully.
    echo The output file should be in the 'data' subfolder (data\cards.json).
    REM Check if the log file was created (indicating some cards weren't matched)
    if exist "data\unmatched_cards.log" (
        echo NOTE: Some entries might not have been matched. Check data\unmatched_cards.log for details.
    )
)

echo.
echo Script finished. Press any key to close this window.
pause > nul