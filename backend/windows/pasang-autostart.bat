@echo off
REM ============================================================
REM  PALORA - Server menyala otomatis saat PC gudang dihidupkan (sekali saja)
REM  - Didaftarkan di Task Scheduler sebagai "PALORA Server" (jalan walau belum login,
REM    tanpa jendela, restart sendiri bila berhenti).
REM  - Membuka port 8090 di Windows Firewall untuk jaringan gudang (Private).
REM
REM  Cara pakai: klik kanan file ini -> Run as administrator.
REM  Hentikan sementara : schtasks /end /tn "PALORA Server"
REM  Nyalakan lagi      : schtasks /run /tn "PALORA Server"
REM  Hapus autostart    : schtasks /delete /tn "PALORA Server" /f
REM ============================================================

net session >nul 2>nul || (
  echo [X] Jalankan file ini dengan klik kanan -^> "Run as administrator".
  pause
  exit /b 1
)

cd /d "%~dp0.."
set "ROOT=%CD%"
if not exist "%ROOT%\pocketbase.exe" (
  echo [X] pocketbase.exe tidak ditemukan di %ROOT%
  pause
  exit /b 1
)
if not exist "%ROOT%\pb_public\index.html" (
  echo [X] Folder pb_public kosong. Di laptop jalankan "npm run build:server" lalu copy ulang folder backend.
  pause
  exit /b 1
)

echo [..] Mendaftarkan "PALORA Server" di Task Scheduler...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0autostart.ps1" -Root "%ROOT%" || (
  echo [X] Gagal mendaftarkan task.
  pause
  exit /b 1
)

echo [..] Membuka port 8090 di Windows Firewall (jaringan Private)...
netsh advfirewall firewall delete rule name="PALORA 8090" >nul 2>nul
netsh advfirewall firewall add rule name="PALORA 8090" dir=in action=allow protocol=TCP localport=8090 profile=private >nul

echo [..] Menyalakan server sekarang...
schtasks /run /tn "PALORA Server" >nul
timeout /t 3 >nul
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8090/api/palora/health).StatusCode } catch { 'GAGAL' }" | findstr 200 >nul && (
  echo.
  echo ============================================================
  echo  [OK] PALORA menyala di http://localhost:8090 dan akan menyala
  echo       otomatis setiap PC dihidupkan. Jangan jalankan
  echo       jalankan-palora.bat bersamaan ^(port bentrok^).
  echo ============================================================
) || (
  echo [!] Task terdaftar tapi server belum menjawab. Coba buka http://localhost:8090 sebentar lagi.
)
pause
