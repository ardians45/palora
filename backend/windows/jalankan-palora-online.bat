@echo off
REM ============================================================
REM  PALORA - Server Online (palora.paletindo.id)
REM  Klik dua kali file ini untuk menyalakan server + domain online.
REM ============================================================
cd /d "%~dp0.."
title PALORA Server Online (palora.paletindo.id)

echo [1/2] Menyalakan PocketBase di port 8090...
start "PALORA Backend" /min pocketbase.exe serve --http=0.0.0.0:8090 --dir=pb_data --migrationsDir=pb_migrations --hooksDir=pb_hooks --publicDir=pb_public

echo [2/2] Menghubungkan domain palora.paletindo.id ke Cloudflare...
echo.
echo ============================================================
echo   PALORA SUDAH AKTIF ONLINE!
echo   Buka di browser: https://palora.paletindo.id
echo   Dashboard Admin: https://palora.paletindo.id/_/
echo.
echo   Tekan Ctrl+C atau tutup jendela ini untuk menghentikan.
echo ============================================================
echo.

cloudflared.exe tunnel run palora
