/*
* Admin functions
* */

var os = require('os'),
    config = require('../config.js'),
    mysql = require('./mysql.js'),
    mongoclient = require('./mongodb.js'),
    user = require('./user.js'),
    domain = require('./domain.js');

exports.test = function() {
    return true;
}

exports.stats = function(callback) {
    var stats = [];

    // Get user stats from database
    mongoclient.open(function(err, mongoclient) {
        var db = mongoclient.db(config.mongodb);
        if (err) {
           return callback (err, null);
        }
        db.collection('users', function(err, collection) {
            if(err) {
               mongoclient.close();
               return (err, null);
            }
            collection.find().count(function(err, userCount) {
                stats.push(userCount);
                db.collection('domains', function(err, collection) {
                    if (err) {
                       mongoclient.close();
                       return (err, null);
                    }
                    collection.find().count(function(err, domainCount) {
                        stats.push(domainCount);
                        mongoclient.close();
                        // Get record stats from MySQL
                        mysql.getConnection(function(err, myConnection) {
                            if (err) {
                                return (err, null);
                            }
                            // console.log(domainId);
                            myConnection.query("SELECT * FROM `records`", function(err, results) {
                                if (err) {
                                    return callback(err, null);
                                }
                                myConnection.release();
                                // console.log(result);
                                stats.push(results.length);
                                var loads = os.loadavg();
                                loads.forEach(function(load) {
                                    stats.push(load.toFixed(2));
                                });
                                // console.log(stats);
                                callback(null, stats);
                            });
                        });
                    });
                });
            });
        });
    });
}

exports.userlist = function(page, limit, callback) {
    mongoclient.open(function(err, mongoclient) {
        var db = mongoclient.db(config.mongodb);
        if(err) {
            return callback(err);
        }
        db.collection('users', function(err, collection) {
            if(err) {
                mongoclient.close();
                return callback(err);
            }
            collection.find({}, {skip: (page - 1) * limit, limit: limit}).sort({
                role: 1,
                name: 1
            }).toArray(function(err, users) {
                if (err) {
                    callback(err, null);
                }
                mongoclient.close();
                callback(null, users);
            });
        });

    });
}

