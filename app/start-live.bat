@echo off
title Point of Sales Inventory Management System - Live (GitHub Pages + MySQL)
echo ============================================================
echo   POINT OF SALES INVENTORY MANAGEMENT SYSTEM - LIVE ACCESS
echo   GitHub Pages frontend + local MySQL
echo   Updated: clean URL with auto API config (v2)
echo ============================================================
echo.
echo Starting XAMPP + Cloudflare tunnel...
echo Updating GitHub Pages config and waiting for rebuild...
echo The browser will open automatically with the LIVE URL.
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0..\tools\start-live.ps1"
echo.
pause
