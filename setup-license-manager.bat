@echo off
echo 🧠 AntiGoldfishMode License Manager Setup
echo.

REM Check if license-manager directory exists
if not exist "..\license-manager" (
    echo ❌ License manager directory not found!
    echo Please make sure you're running this from the antigoldfishmode directory.
    pause
    exit /b 1
)

echo 📁 Navigating to license manager...
cd ..\license-manager

echo 📦 Installing dependencies...
call npm install

echo.
echo ✅ License Manager Setup Complete!
echo.
echo 🚀 Quick Start:
echo   1. Copy .env.example to .env
echo   2. Edit .env with your Gmail credentials
echo   3. Run: npm start
echo.
echo 📧 Gmail Setup:
echo   1. Enable 2FA on Gmail
echo   2. Generate App Password at: https://myaccount.google.com/apppasswords
echo   3. Use the 16-character app password in .env
echo.

pause
