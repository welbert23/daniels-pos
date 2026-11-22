@echo off
title Point of Sales ^& Inventory Management System - XAMPP Launcher
echo ============================================================
echo   POINT OF SALES ^& INVENTORY MANAGEMENT SYSTEM - MySQL Edition
echo ============================================================
echo.
echo Starting XAMPP (Apache + MySQL)...
start "" "C:\xampp\xampp_start.exe"
timeout /t 8 /nobreak >nul
echo.
echo Opening POS app...
start "" "http://localhost/pos-inventory-management-system/index.html?v=33"
echo.
echo   App:        http://localhost/pos-inventory-management-system/index.html?v=33
echo   phpMyAdmin: http://localhost/phpmyadmin/index.php?route=/database/structure^&db=daniels_pos
echo   Database:   daniels_pos  ^|  user: root  ^|  password: (blank)
echo.
echo Done. This window will close automatically.
exit /b 0
