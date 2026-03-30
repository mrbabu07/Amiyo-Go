@echo off
REM Amiyo-Go Installation Script for Windows
REM This script automates the setup process

echo ========================================
echo Amiyo-Go Installation Script
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo [OK] Node.js detected
node -v

REM Check MongoDB
where mongosh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    where mongo >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] MongoDB CLI not found. Make sure MongoDB is installed and running.
    ) else (
        echo [OK] MongoDB CLI detected
    )
) else (
    echo [OK] MongoDB CLI detected
)

REM Check Redis (optional)
where redis-cli >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Redis not found (optional). Install Redis for better performance.
) else (
    echo [OK] Redis detected
)

echo.
echo Installing Server Dependencies...
cd Server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server dependency installation failed
    exit /b 1
)
echo [OK] Server dependencies installed

echo.
echo Installing Client Dependencies...
cd ..\Client
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Client dependency installation failed
    exit /b 1
)
echo [OK] Client dependencies installed

echo.
echo Setting up environment files...
cd ..\Server
if not exist .env (
    copy .env.example .env
    echo [OK] Created Server\.env (please configure it)
) else (
    echo [INFO] Server\.env already exists
)

cd ..\Client
if not exist .env.local (
    if exist .env.example (
        copy .env.example .env.local
        echo [OK] Created Client\.env.local (please configure it)
    ) else (
        echo [WARNING] Client\.env.example not found
    )
) else (
    echo [INFO] Client\.env.local already exists
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Configure Server\.env with your MongoDB URI and Firebase credentials
echo 2. Configure Client\.env.local with your Firebase client config
echo 3. Optional: Install and configure Redis for caching
echo 4. Run 'cd Server && npm run seed:all' to seed initial data
echo 5. Run 'cd Server && npm run make:admin' to create admin user
echo 6. Start development:
echo    - Terminal 1: cd Server && npm run dev
echo    - Terminal 2: cd Client && npm run dev
echo.
echo Documentation:
echo    - Setup Guide: SETUP_GUIDE.md
echo    - Performance: PERFORMANCE_IMPROVEMENTS.md
echo    - Summary: IMPLEMENTATION_SUMMARY.md
echo.
echo Happy coding with Amiyo-Go!
echo.
pause
