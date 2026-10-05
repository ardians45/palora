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
echo   Akses Publik:    https://palora.paletindo.id
echo   Akses Lokal LAN: http://localhost:8090
echo   Dashboard Admin: https://palora.paletindo.id/_/
echo.
echo   Jangan tutup jendela ini selama aplikasi ingin diakses.
echo ============================================================
echo.

if exist "config.yml" (
    cloudflared.exe --config config.yml tunnel run
) else (
    cloudflared.exe tunnel run palora
)
