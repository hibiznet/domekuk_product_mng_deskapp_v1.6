@echo off
setlocal EnableExtensions
title Domeggook Manager - Windows Build

echo.
echo ==========================================
echo   Domeggook Manager Windows x64 Build
echo ==========================================
echo.

echo [1/6] Checking Node and npm...
node -v
if errorlevel 1 goto FAIL_NODE
npm -v
if errorlevel 1 goto FAIL_NODE

echo.
echo [2/6] Removing old node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json

echo.
echo [3/6] Installing npm packages without install scripts...
call npm install --ignore-scripts
if errorlevel 1 goto FAIL_NPM

echo.
echo [4/6] Installing Electron binary...
call node node_modules\electron\install.js
if errorlevel 1 goto FAIL_ELECTRON

echo.
echo [5/6] Installing esbuild binary...
if exist node_modules\esbuild\install.js (
    call node node_modules\esbuild\install.js
    if errorlevel 1 goto FAIL_ESBUILD
)

echo.
echo [6/6] Building Windows x64 NSIS installer...
set ELECTRON_BUILDER_7Z_FILTER=BCJ
call npx electron-builder --win nsis --x64
if errorlevel 1 goto FAIL_BUILD

echo.
echo ==========================================
echo BUILD SUCCESS
echo Check the release folder.
echo ==========================================
if exist release start "" explorer.exe "%CD%\release"
goto END

:FAIL_NODE
echo.
echo ERROR: Node.js or npm is not available.
goto END

:FAIL_NPM
echo.
echo ERROR: npm install failed.
goto END

:FAIL_ELECTRON
echo.
echo ERROR: Electron binary installation failed.
goto END

:FAIL_ESBUILD
echo.
echo ERROR: esbuild binary installation failed.
goto END

:FAIL_BUILD
echo.
echo ERROR: electron-builder failed.
goto END

:END
echo.
pause
endlocal
