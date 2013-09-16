var mysql = require('mysql'),
    config = require('../config.js');
module.exports = mysql.createPool({
    host: config.mysqlhost,
    database: config.mysqldb,
    user: config.mysqluser,
    password: config.mysqlpass
});