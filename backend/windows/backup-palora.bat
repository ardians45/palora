@echo off
REM ============================================================
REM  Backup manual database + file PALORA ke folder backups\
REM  MATIKAN server dulu supaya file database tidak sedang ditulis.
REM  (Backup otomatis terjadwal juga bisa diatur di dashboard admin:
REM   http://localhost:8090/_/  -> Settings -> Backups)
REM ============================================================
cd /d "%~dp0.."
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set STAMP=%%i
if not exist backups mkdir backups
powershell -NoProfile -Command "Compress-Archive -Path pb_data\* -DestinationPath backups\palora-%STAMP%.zip -Force"
echo Backup tersimpan di backups\palora-%STAMP%.zip
pause
