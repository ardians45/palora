# Dipanggil oleh pasang-autostart.bat (Run as administrator). Mendaftarkan PocketBase PALORA
# di Task Scheduler: jalan saat PC menyala (walau belum login), tanpa jendela, restart sendiri bila berhenti.
param([Parameter(Mandatory = $true)][string]$Root)

$exe = Join-Path $Root 'pocketbase.exe'
$serveArgs = 'serve --http=0.0.0.0:8090' +
  " --dir=`"$(Join-Path $Root 'pb_data')`"" +
  " --migrationsDir=`"$(Join-Path $Root 'pb_migrations')`"" +
  " --hooksDir=`"$(Join-Path $Root 'pb_hooks')`"" +
  " --publicDir=`"$(Join-Path $Root 'pb_public')`""

$action = New-ScheduledTaskAction -Execute $exe -Argument $serveArgs -WorkingDirectory $Root
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable

Register-ScheduledTask -TaskName 'PALORA Server' -Action $action -Trigger $trigger -Settings $settings `
  -User 'SYSTEM' -RunLevel Highest -Force -ErrorAction Stop | Out-Null
