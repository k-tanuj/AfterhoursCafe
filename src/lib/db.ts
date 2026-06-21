import mysql from 'mysql2/promise';

export const db = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'student',
    database: process.env.MYSQL_DATABASE || 'afterhours',
    ssl: process.env.MYSQL_HOST ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
