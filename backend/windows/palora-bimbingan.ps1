# PALORA - Launcher bimbingan (jalankan server dari laptop ini)
# Kompatibel Windows PowerShell 5.1. Jangan dipakai bersamaan dengan server gudang.
param(
    [switch]$NoBrowser,
    [switch]$NoWait,
    [switch]$ForceQuickTunnel
)

$ErrorActionPreference = 'Continue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$BackendDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$RepoRoot   = (Resolve-Path (Join-Path $BackendDir '..')).Path
$PublicDomain = 'https://palora.paletindo.id'
$LocalUrl   = 'http://127.0.0.1:8090'
$PbLog      = Join-Path $BackendDir 'pocketbase-bimbingan.log'
$TunnelLog  = Join-Path $BackendDir 'tunnel-bimbingan.log'

$script:Started = New-Object System.Collections.ArrayList

function Test-Health([string]$BaseUrl, [int]$TimeoutSec = 6) {
    try {
        $r = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + '/api/palora/health') -UseBasicParsing -TimeoutSec $TimeoutSec
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

# Kode HTTP domain publik: 200 = ada server online, 530 = tidak ada connector tunnel sama sekali
# (aman memakai named tunnel), lainnya (502, timeout = 0) = ada connector lain/tidak jelas -> jangan pakai named tunnel.
function Get-PublicStatus([int]$TimeoutSec = 8) {
    try {
        $r = Invoke-WebRequest -Uri ($PublicDomain + '/api/palora/health') -UseBasicParsing -TimeoutSec $TimeoutSec
        return [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
}

function Wait-Health([string]$BaseUrl, [int]$MaxSec, [int]$TimeoutSec = 4) {
    $end = (Get-Date).AddSeconds($MaxSec)
    while ((Get-Date) -lt $end) {
        if (Test-Health $BaseUrl $TimeoutSec) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Pause-Enter([string]$Msg) {
    if ($NoWait) { return }
    Read-Host $Msg | Out-Null
}

function Open-Url([string]$Url) {
    if ($NoBrowser) { return }
    try { Start-Process $Url } catch { Write-Host "Gagal membuka browser: $Url" }
}

function Stop-Started {
    foreach ($p in @($script:Started)) {
        try {
            if ($p -and -not $p.HasExited) {
                Write-Host ("Mematikan {0} (PID {1})..." -f $p.ProcessName, $p.Id)
                Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
    $script:Started.Clear()
}

function Get-LanIp {
    try {
        $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object { $_.AddressFamily -eq 'InterNetwork' -and -not $_.ToString().StartsWith('169.254.') -and -not $_.ToString().StartsWith('127.') }
        $pref = $ips | Where-Object { $_.ToString().StartsWith('192.168.') -or $_.ToString().StartsWith('10.') -or $_.ToString().StartsWith('172.') } | Select-Object -First 1
        if ($pref) { return $pref.ToString() }
        $first = $ips | Select-Object -First 1
        if ($first) { return $first.ToString() }
    } catch {}
    return $null
}

Write-Host ''
Write-Host '=== PALORA - Mode Bimbingan (server di laptop ini) ===' -ForegroundColor Cyan
Write-Host ''

try {
    $localUp = Test-Health $LocalUrl 3

    # (a) Server gudang sudah online?
    if (-not $ForceQuickTunnel) {
        Write-Host 'Memeriksa apakah server gudang sudah online...'
        $publicCode = Get-PublicStatus 8
        $script:NamedAllowed = ($publicCode -eq 530)
        Write-Host ("Status domain publik: {0}" -f $publicCode)
        $publicUp = ($publicCode -eq 200)
        if (-not $publicUp -and -not $script:NamedAllowed) {
            Write-Host 'Domain dipegang connector lain / tidak jelas. Memakai tunnel SEMENTARA agar tidak bentrok dengan PC gudang.' -ForegroundColor Yellow
        }
        if ($publicUp -and -not $localUp) {
            Write-Host ''
            Write-Host 'Server gudang SUDAH ONLINE. Tidak ada yang dijalankan di laptop ini.' -ForegroundColor Green
            Write-Host "Membuka $PublicDomain"
            Open-Url $PublicDomain
            Pause-Enter 'Tekan Enter untuk menutup'
            return
        }
        if ($publicUp -and $localUp) {
            Write-Host 'PocketBase lokal sudah jalan dan domain publik aktif. Memakai yang sudah ada (tidak menjalankan tunnel baru).' -ForegroundColor Yellow
        }
    }

    # (b) Segarkan pb_public dari dist (meniru scripts/copy-dist.mjs: hapus pb_public lalu salin dist)
    $distIndex = Join-Path $RepoRoot 'dist\index.html'
    $pubIndex  = Join-Path $BackendDir 'pb_public\index.html'
    if (Test-Path $distIndex) {
        $needRefresh = (-not (Test-Path $pubIndex)) -or ((Get-Item $distIndex).LastWriteTime -gt (Get-Item $pubIndex).LastWriteTime)
        if ($needRefresh -and -not $localUp) {
            Write-Host 'Menyegarkan tampilan aplikasi (dist -> pb_public)...'
            $node = Get-Command node -ErrorAction SilentlyContinue
            $ok = $false
            if ($node) {
                Push-Location $RepoRoot
                try { & node scripts/copy-dist.mjs | Out-Host; $ok = ($LASTEXITCODE -eq 0) } catch { $ok = $false }
                Pop-Location
            }
            if (-not $ok) {
                & robocopy (Join-Path $RepoRoot 'dist') (Join-Path $BackendDir 'pb_public') /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
                if ($LASTEXITCODE -ge 8) { Write-Host 'Peringatan: gagal menyalin dist, memakai pb_public yang ada.' -ForegroundColor Yellow }
            }
        }
    } else {
        Write-Host 'Folder dist tidak ada, memakai pb_public apa adanya.'
    }

    # (c) PocketBase
    if (-not $localUp) {
        Write-Host 'Menyalakan PocketBase di port 8090...'
        $pbArgs = 'serve --http=0.0.0.0:8090 --dir=pb_data --migrationsDir=pb_migrations --hooksDir=pb_hooks --publicDir=pb_public'
        $pb = Start-Process -FilePath (Join-Path $BackendDir 'pocketbase.exe') -ArgumentList $pbArgs -WorkingDirectory $BackendDir `
            -WindowStyle Hidden -RedirectStandardOutput $PbLog -RedirectStandardError ($PbLog + '.err') -PassThru
        [void]$script:Started.Add($pb)
        if (-not (Wait-Health $LocalUrl 25)) {
            Write-Host ''
            Write-Host 'GAGAL: PocketBase tidak merespons dalam 25 detik.' -ForegroundColor Red
            Write-Host "Cek log: $PbLog dan $PbLog.err"
            Write-Host 'Kemungkinan port 8090 dipakai program lain.'
            Stop-Started
            Pause-Enter 'Tekan Enter untuk menutup'
            return
        }
    } else {
        Write-Host 'PocketBase lokal sudah berjalan, dipakai ulang.'
    }

    # (d) Tunnel
    $publicUrl = $null
    $cf = Join-Path $BackendDir 'cloudflared.exe'
    $publicAlreadyOurs = (-not $ForceQuickTunnel) -and $localUp -and (Test-Health $PublicDomain 6)
    if ($publicAlreadyOurs) {
        $publicUrl = $PublicDomain
    } elseif (Test-Path $cf) {
        $hasNamed = (Test-Path (Join-Path $BackendDir 'config.yml')) -and (Test-Path (Join-Path $BackendDir 'tunnel.json'))
        if ($hasNamed -and -not $ForceQuickTunnel -and $script:NamedAllowed) {
            Write-Host 'Menghubungkan domain palora.paletindo.id (tunnel Cloudflare)...'
            $t = Start-Process -FilePath $cf -ArgumentList '--config config.yml tunnel run' -WorkingDirectory $BackendDir `
                -WindowStyle Hidden -RedirectStandardOutput ($TunnelLog + '.out') -RedirectStandardError $TunnelLog -PassThru
            [void]$script:Started.Add($t)
            if (Wait-Health $PublicDomain 40 5) {
                $publicUrl = $PublicDomain
            } else {
                Write-Host 'Tunnel domain tidak berhasil. Mencoba tunnel sementara...' -ForegroundColor Yellow
                try { if (-not $t.HasExited) { Stop-Process -Id $t.Id -Force } } catch {}
                [void]$script:Started.Remove($t)
            }
        }
        if (-not $publicUrl) {
            Write-Host 'Menyalakan tunnel sementara (trycloudflare.com)...'
            # --config ke file kosong agar config.yml / ~/.cloudflared tidak terbaca (quick tunnel ditolak bila ada config).
            $emptyCfg = Join-Path $env:TEMP 'palora-empty-cloudflared.yml'
            Set-Content -Path $emptyCfg -Value '# kosong' -Encoding ASCII
            $qlog = $TunnelLog
            $qArgs = '--config "{0}" tunnel --no-autoupdate --url {1}' -f $emptyCfg, $LocalUrl
            $q = Start-Process -FilePath $cf -ArgumentList $qArgs -WorkingDirectory $env:TEMP `
                -WindowStyle Hidden -RedirectStandardOutput ($qlog + '.out') -RedirectStandardError $qlog -PassThru
            [void]$script:Started.Add($q)
            $end = (Get-Date).AddSeconds(30)
            $found = $null
            while ((Get-Date) -lt $end -and -not $found) {
                Start-Sleep -Seconds 1
                if ($q.HasExited) { break }
                if (Test-Path $qlog) {
                    $txt = Get-Content $qlog -Raw -ErrorAction SilentlyContinue
                    if ($txt -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $found = $Matches[0] }
                }
            }
            if ($found -and (Wait-Health $found 40 5)) {
                $publicUrl = $found
            } else {
                Write-Host "Tunnel sementara juga gagal. Cek log: $qlog" -ForegroundColor Red
                try { if (-not $q.HasExited) { Stop-Process -Id $q.Id -Force } } catch {}
                [void]$script:Started.Remove($q)
            }
        }
    } else {
        Write-Host 'cloudflared.exe tidak ditemukan, tunnel dilewati.' -ForegroundColor Yellow
    }

    # (e) Ringkasan
    $lan = Get-LanIp
    $lanUrl = if ($lan) { "http://${lan}:8090" } else { '(tidak terdeteksi)' }
    $main = if ($publicUrl) { $publicUrl } else { 'http://localhost:8090' }
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host '  PALORA AKTIF (laptop ini)' -ForegroundColor Green
    if ($publicUrl) {
        Write-Host "  Akses Publik   : $publicUrl"
    } else {
        Write-Host '  Akses Publik   : TIDAK TERSEDIA (tunnel gagal)' -ForegroundColor Yellow
        Write-Host '                   Pakai alamat lokal di bawah.'
    }
    Write-Host "  Akses LAN      : $lanUrl"
    Write-Host '  Akses Lokal    : http://localhost:8090'
    Write-Host "  Dashboard Admin: $main/_/"
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host ''
    try { Set-Clipboard -Value $main; Write-Host "Alamat disalin ke clipboard: $main" } catch {}
    Open-Url $main
    Write-Host ''
    Write-Host 'CATATAN: data di laptop ini adalah SALINAN TERPISAH dari database PC gudang.' -ForegroundColor Yellow
    Write-Host '         Perubahan di sini tidak masuk ke server gudang, dan sebaliknya.' -ForegroundColor Yellow
    Write-Host ''

    if ($NoWait) { return }
    if ($script:Started.Count -gt 0) {
        Read-Host 'Tekan Enter untuk MEMATIKAN server' | Out-Null
    } else {
        Read-Host 'Tidak ada proses yang dijalankan skrip ini. Tekan Enter untuk menutup' | Out-Null
    }
}
finally {
    Stop-Started
}
