@echo off
REM ============================================================
REM  PALORA - Server Gudang (Windows)
REM  Klik dua kali file ini untuk menyalakan server.
REM  Aplikasi bisa dibuka dari komputer/HP lain di jaringan gudang:
REM     http://<IP-komputer-ini>:8090
REM  Dashboard admin database: http://<IP-komputer-ini>:8090/_/
REM ============================================================
cd /d "%~dp0.."
title PALORA Server Gudang
echo Menyalakan PALORA di port 8090 ... (jangan tutup jendela ini)
pocketbase.exe serve --http=0.0.0.0:8090 --dir=pb_data --migrationsDir=pb_migrations --hooksDir=pb_hooks --publicDir=pb_public
pause
