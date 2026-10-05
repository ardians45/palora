@echo off
setlocal EnableDelayedExpansion
REM ============================================================
REM  PALORA - commit & push ke GitHub (ardians45/palora, branch main)
REM
REM  Cara pakai (dari folder palora):
REM     scripts\push.bat                    -> test dulu, lalu commit & push
REM     scripts\push.bat "pesan commit"     -> pakai pesan commit sendiri
REM     scripts\push.bat "pesan" --cepat    -> lewati test (tidak disarankan)
REM     scripts\push.bat "pesan" --e2e      -> tambah test browser (lebih lama)
REM ============================================================

cd /d "%~dp0.."
title PALORA - Push ke GitHub

where git >nul 2>nul || (echo [X] Git belum terpasang. Install dari https://git-scm.com & ulangi. & goto :gagal)
where npm >nul 2>nul || (echo [X] Node.js/npm belum terpasang. & goto :gagal)

set "PESAN=%~1"
if "%PESAN%"=="" set "PESAN=Update PALORA %date% %time:~0,5%"
set "MODE=%~2"

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
echo.
echo  Repo   :
git remote get-url origin
echo  Branch : %BRANCH%
echo  Pesan  : %PESAN%
echo.

REM --- 1. Pastikan file rahasia & data lokal tidak ikut ---------------------
for %%f in ("backend/.env" "backend/pocketbase.exe" "backend/pb_data") do (
  git check-ignore -q %%f || (echo [X] %%~f TIDAK di-ignore. Periksa .gitignore dulu. & goto :gagal)
)
echo [OK] .env, pocketbase.exe, pb_data tidak ikut ter-push.

REM --- 2. Ada perubahan? ----------------------------------------------------
git status --short > "%TEMP%\palora-status.txt"
for %%A in ("%TEMP%\palora-status.txt") do set "SIZE=%%~zA"
if "%SIZE%"=="0" (
  echo [i] Tidak ada perubahan baru. Cek apakah ada commit yang belum ter-push...
  goto :push
)
echo [i] File yang berubah:
type "%TEMP%\palora-status.txt"
echo.

REM --- 3. Test sebelum push -------------------------------------------------
if /i "%MODE%"=="--cepat" (
  echo [!] Test dilewati ^(--cepat^).
) else (
  echo [..] Menjalankan test unit ^& integrasi...
  call npm test || (echo [X] Ada test yang gagal. Perbaiki dulu, push dibatalkan. & goto :gagal)
  if /i "%MODE%"=="--e2e" (
    echo [..] Menjalankan test browser ^(E2E^)...
    call npm run test:e2e || (echo [X] Test E2E gagal. Push dibatalkan. & goto :gagal)
  )
  echo [..] Cek build...
  call npx vite build --logLevel error || (echo [X] Build gagal. Push dibatalkan. & goto :gagal)
)

REM --- 4. Commit ------------------------------------------------------------
git add -A || goto :gagal
git commit -m "%PESAN%" || goto :gagal
echo [OK] Commit dibuat.

:push
REM --- 5. Ambil perubahan teman satu tim dulu, baru push ----------------------
echo [..] Menarik perubahan terbaru dari GitHub...
git pull --rebase origin %BRANCH%
if errorlevel 1 (
  echo [X] Ada konflik dengan perubahan di GitHub.
  echo     Selesaikan konflik, lalu jalankan:  git rebase --continue
  echo     Atau batalkan dengan:               git rebase --abort
  goto :gagal
)

echo [..] Push ke GitHub (kalau muncul jendela login, pilih akun fer-lynchh)...
git push origin %BRANCH% || (echo [X] Push gagal. Pastikan akun fer-lynchh sudah jadi collaborator repo. & goto :gagal)

echo.
echo ============================================================
echo  [OK] Berhasil push ke GitHub.
echo ============================================================
git log --oneline -3
del "%TEMP%\palora-status.txt" >nul 2>nul
pause
exit /b 0

:gagal
echo.
echo ============================================================
echo  [X] Push TIDAK dilakukan. Baca pesan di atas.
echo ============================================================
del "%TEMP%\palora-status.txt" >nul 2>nul
pause
exit /b 1
