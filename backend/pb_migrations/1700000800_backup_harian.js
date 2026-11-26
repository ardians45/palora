/// <reference path="../pb_data/types.d.ts" />
// Backup otomatis: setiap hari pukul 23.00 WIB (16.00 UTC), simpan 14 backup terakhir di pb_data/backups.
// Tanpa ini backup hanya terjadi bila seseorang ingat menjalankan backup-palora.bat.
// Catatan: backup masih di disk yang sama dengan database; salin berkala ke flashdisk/Google Drive.
migrate(
  (app) => {
    const settings = app.settings();
    if (!settings.backups.cron) {
      settings.backups.cron = "0 16 * * *";
      settings.backups.cronMaxKeep = 14;
      app.save(settings);
    }
  },
  (app) => {
    // Sengaja kosong: jadwal backup tidak dicabut otomatis.
  }
);
