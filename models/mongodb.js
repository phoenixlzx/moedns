var config = require('../config.js'),
    Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server;
module.exports = new Db(config.mongodb, new Server(config.mongohost, Connection.DEFAULT_PORT, {}), {safe: true});