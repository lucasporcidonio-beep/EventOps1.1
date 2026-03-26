import db from './db.js';

const check = async () => {
    console.log('Checking database counts...');

    const tables = ['events', 'contracts', 'professionals', 'assignments', 'checklists', 'sub_events', 'expenses'];

    for (const table of tables) {
        db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
            if (err) console.error(`Error counting ${table}:`, err.message);
            else console.log(`${table}: ${row.count}`);
        });
    }
};

check();
