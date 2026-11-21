@echo off
title Daniel's POS - XAMPP Launcher
echo ============================================================
echo   DANIEL'S BARBECUE POS - MySQL Edition
echo ============================================================
echo.
echo Starting XAMPP (Apache + MySQL)...
start "" "C:\xampp\xampp_start.exe"
timeout /t 8 /nobreak >nul
echo.
echo Opening POS app...
start "" "http://localhost/daniels-pos/index.html?v=16"
echo.
echo   App:        http://localhost/daniels-pos/index.html?v=16
echo   phpMyAdmin: http://localhost/phpmyadmin/index.php?route=/database/structure^&db=daniels_pos
echo   Database:   daniels_pos  ^|  user: root  ^|  password: (blank)
echo.
echo You can close this window once the app opens.
timeout /t 5 /nobreak >nul
