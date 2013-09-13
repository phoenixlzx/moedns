var config = require('../config.js'),
    Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server;

module.exports = new MongoClient(new Server(config.mongohost, Connection.DEFAULT_PORT, {native_parser: true}));

/*
* var config = require('../config.js'),
* Db = require('mongodb').Db,
* Connection = require('mongodb').Connection,
* Server = require('mongodb').Server;
* module.exports = new Db(config.mongodb, new Server(config.mongohost, Connection.DEFAULT_PORT, {auto_reconnect: true}), {safe: true});
*
* */