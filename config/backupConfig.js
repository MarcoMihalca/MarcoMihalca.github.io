const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const backupsDir = path.join(__dirname, '..', 'backups');

// Asigură-te că folderul de backups există
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

function runBackupAndCleanup() {
    console.log('[Backup] Se inițiază procesul de backup...');
    
    // Numele fișierului de backup (ex: facturio_backup_168... .db)
    const backupName = `facturio_backup_${Date.now()}.db`;
    const backupPath = path.join(backupsDir, backupName);
    
    db.backup(backupPath)
        .then(() => {
            console.log(`[Backup] Succes: ${backupName}`);
            
            // Ștergem fișierele mai vechi de 3 luni (90 de zile)
            const files = fs.readdirSync(backupsDir);
            const now = Date.now();
            const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
            
            let deletedCount = 0;
            
            files.forEach(file => {
                if (file.endsWith('.db')) {
                    const filePath = path.join(backupsDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (now - stats.mtimeMs > THREE_MONTHS_MS) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                }
            });
            
            if (deletedCount > 0) {
                console.log(`[Backup Cleanup] Au fost șterse ${deletedCount} backup-uri vechi (peste 3 luni).`);
            }
        })
        .catch(err => {
            console.error('[Backup] Eroare la crearea backup-ului:', err);
        });
}

// Programăm cron job-ul (Se va rula în fiecare zi de Duminică la miezul nopții - practic o dată la 7 zile)
cron.schedule('0 0 * * 0', () => {
    runBackupAndCleanup();
});

console.log('✅ Sistemul de backup automat a fost inițializat (rulează o dată la 7 zile).');

module.exports = { runBackupAndCleanup };
