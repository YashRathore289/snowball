const mysql = require('mysql')

const pool = mysql.createPool({
    host: process.env.host,
    port: process.env.port,
    user: process.env.user,
    password: process.env.password,
    database: 'snowball',
    multipleStatements: true,
    connectionLimit: 100
})

module.exports = pool