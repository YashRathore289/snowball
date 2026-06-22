const mysql = require('mysql2')

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'snowball',
    multipleStatements: true,
    connectionLimit: 100,
    queueLimit:         0,    
    waitForConnections: true,
    connectTimeout:     30000,
    ssl: { rejectUnauthorized: false },
    enableKeepAlive:    true,
    keepAliveInitialDelay: 30000,
})

module.exports = pool