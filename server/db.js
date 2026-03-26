import sqlite3 from 'sqlite3';
import { mkdirp } from 'mkdirp';
import path from 'path';

// Ensure data directory exists if we move DB there, currently root of server
const dbPath = './database.sqlite';

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Events Table
        db.run(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_type TEXT,
      client_name TEXT,
      client_phone TEXT,
      client_rg TEXT,
      client_birthdate TEXT,
      client_address TEXT,
      event_date TEXT,
      coverage_start_time TEXT,
      coverage_end_time TEXT,
      ceremony_location TEXT,
      reception_location TEXT,
      main_service TEXT,
      additional_services TEXT, -- JSON array
      operational_status TEXT,
      confirmation_status TEXT,
      notes TEXT,
      debutante_name TEXT,
      groom_name TEXT,
      bride_name TEXT,
      birthday_person_name TEXT,
      package_name TEXT,
      package_value REAL,
      materials_delivered INTEGER DEFAULT 0 -- boolean 0/1
    )`);

        // Contracts Table
        db.run(`CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      total_value REAL,
      total_paid REAL,
      entry_payment_value REAL,
      entry_payment_date TEXT,
      entry_payment_method TEXT,
      entry_payment_confirmed INTEGER DEFAULT 0, -- boolean
      payment_history TEXT, -- JSON array
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
    )`);

        // Professionals Table
        db.run(`CREATE TABLE IF NOT EXISTS professionals (
      id TEXT PRIMARY KEY,
      name TEXT,
      roles TEXT, -- JSON array
      pix_key TEXT,
      phone TEXT,
      notes TEXT
    )`);

        // Team Assignments Table
        db.run(`CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      professional_id TEXT,
      role TEXT,
      cache_value REAL,
      cache_paid INTEGER DEFAULT 0, -- boolean
      service_performed INTEGER DEFAULT 0, -- boolean
      payment_date TEXT,
      primary_assignment INTEGER DEFAULT 0, -- boolean
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(professional_id) REFERENCES professionals(id) ON DELETE CASCADE
    )`);

        // Checklists Table
        db.run(`CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      date_confirmed INTEGER DEFAULT 0,
      time_confirmed INTEGER DEFAULT 0,
      location_confirmed INTEGER DEFAULT 0,
      contact_confirmed INTEGER DEFAULT 0,
      authorized_event INTEGER DEFAULT 0,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
    )`);

        // SubEvents Table
        db.run(`CREATE TABLE IF NOT EXISTS sub_events (
      id TEXT PRIMARY KEY,
      parent_event_id TEXT,
      type TEXT,
      date TEXT,
      time TEXT,
      location TEXT,
      notes TEXT,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY(parent_event_id) REFERENCES events(id) ON DELETE CASCADE
    )`);

        // Expenses Table
        db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      category TEXT,
      description TEXT,
      value REAL,
      date TEXT,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
    )`);

        console.log('Database tables initialized.');

        // MIGRATION: Add missing columns that may not exist in restored DBs
        const autoMigrations = [
            `ALTER TABLE contracts ADD COLUMN id TEXT`,
            `ALTER TABLE contracts ADD COLUMN payment_history TEXT DEFAULT '[]'`,
            `ALTER TABLE contracts ADD COLUMN total_paid REAL DEFAULT 0`,
            `ALTER TABLE contracts ADD COLUMN total_value REAL DEFAULT 0`,
            `ALTER TABLE contracts ADD COLUMN entry_payment_value REAL DEFAULT 0`,
            `ALTER TABLE contracts ADD COLUMN entry_payment_date TEXT`,
            `ALTER TABLE contracts ADD COLUMN entry_payment_method TEXT`,
            `ALTER TABLE contracts ADD COLUMN entry_payment_confirmed INTEGER DEFAULT 0`,
            // Professionals
            `ALTER TABLE professionals ADD COLUMN pix_key TEXT`,
            `ALTER TABLE professionals ADD COLUMN phone TEXT`,
            `ALTER TABLE professionals ADD COLUMN notes TEXT`,
            // Assignments
            `ALTER TABLE assignments ADD COLUMN id TEXT`,
            `ALTER TABLE assignments ADD COLUMN "primary" INTEGER DEFAULT 0`,
            `ALTER TABLE assignments ADD COLUMN service_confirmed INTEGER DEFAULT 0`,
            `ALTER TABLE assignments ADD COLUMN cache_value REAL`,
            `ALTER TABLE assignments ADD COLUMN cache_paid INTEGER DEFAULT 0`,
            `ALTER TABLE assignments ADD COLUMN cache_payment_date TEXT`,
            `ALTER TABLE assignments ADD COLUMN date TEXT`,
            `ALTER TABLE assignments ADD COLUMN status TEXT`,
            `ALTER TABLE assignments ADD COLUMN value REAL`
        ];
        autoMigrations.forEach(sql => {
            db.run(sql, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // Ignore "duplicate column" errors (column already exists)
                    if (!err.message.includes('duplicate column name')) {
                        console.log('Migration skipped (already exists):', sql.split('ADD COLUMN')[1]?.trim().split(' ')[0]);
                    }
                } else if (!err) {
                    console.log('Migration applied:', sql.split('ADD COLUMN')[1]?.trim().split(' ')[0]);
                }
            });
        });
        
        // MIGRATION for Assignments ID Population:
        // Set a random UUID for assignments that were restored without an ID
        db.run(`UPDATE assignments SET id = lower(hex(randomblob(16))) WHERE id IS NULL OR id = ''`, (err) => {
            if (!err) console.log('Assignments IDs populated if missing.');
        });
    });
}

export default db;
