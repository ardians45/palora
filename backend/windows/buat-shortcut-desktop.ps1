# Membuat shortcut "Server PALORA" di Desktop, dengan logo PALORA.
$desktop = [Environment]::GetFolderPath('Desktop')
$winDir  = $PSScriptRoot
$bat     = Join-Path $winDir 'PALORA-Bimbingan.bat'
$icon    = Join-Path $winDir 'palora.ico'
$lnk     = Join-Path $desktop 'Server PALORA.lnk'
$oldLnk  = Join-Path $desktop 'PALORA Bimbingan.lnk'

if (Test-Path $oldLnk) {
    Remove-Item $oldLnk -Force
    Write-Host "Shortcut lama dihapus: $oldLnk"
}

if (-not (Test-Path $icon)) { Write-Host "PERINGATAN: icon tidak ditemukan: $icon" }

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnk)
$s.TargetPath = $bat
$s.WorkingDirectory = $winDir
$s.IconLocation = "$icon,0"
$s.Description = 'Nyalakan server PALORA (lokal + tunnel)'
$s.Save()
Write-Host "Shortcut dibuat: $lnk"
