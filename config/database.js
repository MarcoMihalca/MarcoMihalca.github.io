const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'facturio.db');

// Deschide/creează baza de date
const db = new Database(DB_PATH);

// Activare WAL mode (performanță mai bună)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Creare tabele ---
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        serie TEXT NOT NULL,
        numar TEXT NOT NULL,
        data_emitere DATE NOT NULL,
        data_scadenta DATE,
        -- Furnizor
        furn_nume TEXT,
        furn_cui TEXT,
        furn_reg_com TEXT,
        furn_adresa TEXT,
        furn_iban TEXT,
        furn_banca TEXT,
        -- Client
        client_nume TEXT,
        client_cui TEXT,
        client_reg_com TEXT,
        client_adresa TEXT,
        client_email TEXT,
        -- Totaluri
        subtotal REAL DEFAULT 0,
        total_tva REAL DEFAULT 0,
        total REAL DEFAULT 0,
        pret_cu_tva INTEGER DEFAULT 0,
        -- Meta
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        denumire TEXT NOT NULL,
        descriere TEXT,
        um TEXT DEFAULT 'buc',
        cantitate REAL DEFAULT 1,
        pret_unitar REAL DEFAULT 0,
        tva_percent REAL DEFAULT 19,
        valoare_fara_tva REAL DEFAULT 0,
        valoare_tva REAL DEFAULT 0,
        total REAL DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
`);

// --- Seed utilizatori default (dacă nu există) ---
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)');
    
    const adminHash = bcrypt.hashSync('admin', 10);
    const userHash = bcrypt.hashSync('user', 10);

    insertUser.run('admin', adminHash, 'admin@facturio.ro');
    insertUser.run('user', userHash, 'user@facturio.ro');

    console.log('✅ Utilizatori default creați (admin/admin, user/user)');
}

module.exports = db;
