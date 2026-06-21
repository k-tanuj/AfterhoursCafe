import mysql from 'mysql2/promise';

export const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'student',
    database: 'afterhours',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
