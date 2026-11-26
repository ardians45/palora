@echo off
REM ============================================================
REM  PALORA - Pasang update otomatis di PC gudang (sekali saja)
REM  Setelah ini PC gudang mengecek GitHub tiap 10 menit. Bila ada rilis baru:
REM  backup database -> pasang versi baru -> nyalakan lagi. Bila gagal, versi lama dikembalikan.
REM  Database (pb_data) tidak pernah diganti oleh update.
REM
REM  Cara pakai: taruh file ini di folder "windows" milik PALORA (mis. C:\PALORA\windows),
REM  lalu klik kanan -> Run as administrator.
REM  Lihat hasil    : update-palora.log di folder PALORA
REM  Hentikan       : schtasks /delete /tn "PALORA Update" /f
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
  echo     Taruh file ini di folder "windows" milik PALORA, mis. C:\PALORA\windows
  pause
  exit /b 1
)

echo [..] Mengunduh skrip update terbaru dari GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/ardians45/palora/main/backend/windows/update-palora.ps1' -OutFile '%ROOT%\windows\update-palora.ps1'" || (
  echo [X] Gagal mengunduh. Cek koneksi internet PC ini.
  pause
  exit /b 1
)

echo [..] Mendaftarkan "PALORA Update" di Task Scheduler (tiap 10 menit)...
schtasks /create /tn "PALORA Update" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File \"%ROOT%\windows\update-palora.ps1\"" /sc minute /mo 10 /ru SYSTEM /rl HIGHEST /f >nul || (
  echo [X] Gagal mendaftarkan task.
  pause
  exit /b 1
)

echo [..] Memasang versi terbaru sekarang (server berhenti sebentar, kurang dari 1 menit)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\windows\update-palora.ps1"

echo.
echo ============================================================
echo  Selesai. Riwayat update: %ROOT%\update-palora.log
echo  Versi terpasang        : %ROOT%\versi-terpasang.txt
echo ============================================================
pause
