@echo off
REM ============================================================
REM  PALORA - Pasang Cloudflare Tunnel di PC gudang (sekali saja)
REM  Supaya PALORA bisa dibuka dari internet di https://palora.paletindo.id
REM  tanpa IP publik / buka port router.
REM
REM  Cara pakai (klik kanan -> Run as administrator):
REM     pasang-tunnel.bat <TOKEN>
REM  TOKEN didapat dari dashboard Cloudflare Zero Trust -> Networks -> Tunnels
REM  (lihat docs/DEPLOY.md bagian "Akses dari internet dengan subdomain").
REM ============================================================

if "%~1"=="" (
  echo [X] Token belum diisi.
  echo     Contoh: pasang-tunnel.bat eyJhIjoi....
  pause
  exit /b 1
)

net session >nul 2>nul || (
  echo [X] Jalankan file ini dengan klik kanan -^> "Run as administrator".
  pause
  exit /b 1
)

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo [..] Memasang cloudflared...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements || (
    echo [X] Gagal memasang cloudflared. Download manual dari:
    echo     https://github.com/cloudflare/cloudflared/releases  ^(cloudflared-windows-amd64.msi^)
    pause
    exit /b 1
  )
  set "PATH=%PATH%;C:\Program Files (x86)\cloudflared;C:\Program Files\cloudflared"
)

echo [..] Memasang tunnel sebagai Windows Service (otomatis jalan saat PC menyala)...
cloudflared service install %1 || (
  echo [X] Gagal memasang service. Bila sebelumnya sudah pernah dipasang, hapus dulu:
  echo     cloudflared service uninstall
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  [OK] Tunnel terpasang. Pastikan jalankan-palora.bat juga menyala,
echo       lalu buka https://palora.paletindo.id dari HP (pakai data seluler).
echo ============================================================
pause
