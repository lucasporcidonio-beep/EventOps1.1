import db from './db.js';

const check = async () => {
    console.log('Checking events table...');
    db.all('SELECT count(*) as count FROM events', (err, rows) => {
        if (err) {
            console.error('Error reading events:', err.message);
        } else {
            console.log('Events count:', rows[0].count);
        }
    });
};

check();
