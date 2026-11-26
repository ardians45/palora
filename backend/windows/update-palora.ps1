# PALORA - update otomatis PC gudang dari GitHub Releases (dijalankan Task Scheduler tiap 10 menit).
# Alur: cek rilis terbaru -> backup database + kode lama -> matikan server -> timpa kode -> nyalakan -> cek sehat.
# Bila server tidak sehat setelah update: kode & database dikembalikan ke sebelum update, rilis itu tidak dicoba lagi.
# Database (pb_data) tidak pernah diganti oleh rilis; hanya di-backup, dan dipulihkan bila update gagal.
param(
    [string]$Root = (Split-Path $PSScriptRoot -Parent),
    [string]$Repo = 'ardians45/palora',
    [int]$Port = 8090,
    [string]$ZipFile = ''   # hanya untuk uji: pakai zip lokal, bukan unduh dari GitHub
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Dirs = @('pb_migrations', 'pb_hooks', 'pb_public', 'windows')
$Log = Join-Path $Root 'update-palora.log'
$Exe = Join-Path $Root 'pocketbase.exe'
$Task = 'PALORA Server'
$Health = "http://127.0.0.1:$Port/api/palora/health"

function Write-Log([string]$m) {
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
    Add-Content -Path $Log -Value $line -Encoding UTF8
    Write-Host $line
}
function Test-Up { try { return ((Invoke-WebRequest -Uri $Health -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200) } catch { return $false } }
function Wait-Up([int]$sec) { $end = (Get-Date).AddSeconds($sec); while ((Get-Date) -lt $end) { if (Test-Up) { return $true }; Start-Sleep 2 }; return $false }
function Get-Server { Get-Process pocketbase -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $Exe } }
# lewat cmd: di PowerShell 5.1, stderr program luar + ErrorActionPreference=Stop dianggap error fatal
function Test-Task { cmd /c "schtasks /query /tn `"$Task`" >nul 2>nul"; return ($LASTEXITCODE -eq 0) }
function Stop-Server {
    if ($script:UseTask) { cmd /c "schtasks /end /tn `"$Task`" >nul 2>nul" }
    Get-Server | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
}
function Start-Server {
    if ($script:UseTask) { cmd /c "schtasks /run /tn `"$Task`" >nul 2>nul"; return }
    $a = "serve --http=0.0.0.0:$Port --dir=pb_data --migrationsDir=pb_migrations --hooksDir=pb_hooks --publicDir=pb_public"
    Start-Process -FilePath $Exe -ArgumentList $a -WorkingDirectory $Root -WindowStyle Hidden
}
function Copy-Code([string]$from, [string]$to) {
    foreach ($d in $Dirs) {
        $src = Join-Path $from $d
        if (-not (Test-Path $src)) { continue }
        $dst = Join-Path $to $d
        if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
        Copy-Item $src $dst -Recurse -Force
    }
}

if (-not (Test-Path $Exe)) { Write-Host "pocketbase.exe tidak ada di $Root"; exit 1 }
$tmp = Join-Path $env:TEMP ('palora-update-' + [guid]::NewGuid().ToString('N'))
try {
    # --- 1. rilis terbaru ---
    if ($ZipFile) {
        $tag = 'uji-' + (Get-Item $ZipFile).LastWriteTime.ToString('yyyyMMddHHmmss')
    } else {
        $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ 'User-Agent' = 'palora-update' } -TimeoutSec 20
        $tag = $rel.tag_name
        $asset = $rel.assets | Where-Object { $_.name -eq 'palora-update.zip' } | Select-Object -First 1
        if (-not $asset) { exit 0 }
    }
    $verFile = Join-Path $Root 'versi-terpasang.txt'
    $badFile = Join-Path $Root 'update-gagal.txt'
    $current = if (Test-Path $verFile) { (Get-Content $verFile -TotalCount 1).Trim() } else { '' }
    if ($tag -eq $current) { exit 0 }
    if ((Test-Path $badFile) -and ((Get-Content $badFile -TotalCount 1).Trim() -eq $tag)) { exit 0 }

    Write-Log "Rilis baru $tag (terpasang: $(if ($current) { $current } else { 'belum tercatat' }))"
    New-Item -ItemType Directory -Path $tmp | Out-Null
    $zip = Join-Path $tmp 'update.zip'
    if ($ZipFile) { Copy-Item $ZipFile $zip } else {
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing -TimeoutSec 300
        # GitHub mencantumkan sha256 tiap berkas rilis: tolak unduhan yang rusak / tidak lengkap
        if ($asset.digest -and $asset.digest.StartsWith('sha256:')) {
            $got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
            if ($got -ne $asset.digest.Substring(7).ToLower()) { throw 'Unduhan rusak (sha256 tidak cocok).' }
        }
    }
    $new = Join-Path $tmp 'baru'
    Expand-Archive -Path $zip -DestinationPath $new -Force
    foreach ($d in @('pb_migrations', 'pb_hooks', 'pb_public')) {
        if (-not (Test-Path (Join-Path $new $d))) { throw "Isi rilis tidak lengkap: $d tidak ada." }
    }
    if (-not (Test-Path (Join-Path $new 'pb_public\index.html'))) { throw 'Isi rilis tidak lengkap: pb_public\index.html tidak ada.' }

    # --- 2. matikan server, backup database + kode lama ---
    $script:UseTask = Test-Task
    $wasRunning = [bool](Get-Server) -or (Test-Up)
    Stop-Server
    $script:Stopped = $true
    $bdir = Join-Path $Root 'backups'
    if (-not (Test-Path $bdir)) { New-Item -ItemType Directory -Path $bdir | Out-Null }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $dbBackup = Join-Path $bdir "sebelum-update-$stamp.zip"
    Compress-Archive -Path (Join-Path $Root 'pb_data\*') -DestinationPath $dbBackup -Force
    $old = Join-Path $tmp 'lama'
    New-Item -ItemType Directory -Path $old | Out-Null
    Copy-Code $Root $old
    Write-Log "Backup database: $dbBackup"

    # --- 3. pasang kode baru, nyalakan, cek sehat ---
    Copy-Code $new $Root
    Start-Server
    if (Wait-Up 90) {
        Set-Content -Path $verFile -Value $tag -Encoding ASCII
        Write-Log "BERHASIL: PALORA sekarang versi $tag"
        # simpan 10 backup sebelum-update terakhir
        Get-ChildItem $bdir -Filter 'sebelum-update-*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 | Remove-Item -Force
    } else {
        Write-Log "GAGAL: server tidak sehat setelah update $tag. Mengembalikan versi & database sebelumnya..."
        Stop-Server
        Copy-Code $old $Root
        $data = Join-Path $Root 'pb_data'
        Remove-Item $data -Recurse -Force
        New-Item -ItemType Directory -Path $data | Out-Null
        Expand-Archive -Path $dbBackup -DestinationPath $data -Force
        Set-Content -Path $badFile -Value $tag -Encoding ASCII
        if ($wasRunning) { Start-Server }
        if (Wait-Up 90) { Write-Log 'Versi lama sudah jalan lagi. Rilis ini tidak akan dicoba ulang.' }
        else { Write-Log 'PERHATIAN: versi lama juga belum merespons. Nyalakan PALORA secara manual.' }
        exit 1
    }
} catch {
    Write-Log ('ERROR: ' + $_.Exception.Message)
    # error setelah server dimatikan: kembalikan kode lama (bila sempat disalin) dan nyalakan lagi
    if ($script:Stopped) {
        $old = Join-Path $tmp 'lama'
        if (Test-Path (Join-Path $old 'pb_hooks')) { Copy-Code $old $Root }
        if (-not (Test-Up)) { Start-Server }
        Write-Log 'Server dinyalakan lagi dengan versi sebelumnya.'
    }
    exit 1
} finally {
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}
