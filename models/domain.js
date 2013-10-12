/*
* Domain functions
*
* */

var async = require('async'),
    config = require('../config.js'),
    mongoclient = require('./mongodb.js'),
    mysql = require('./mysql.js');

function Domain(domain) {
    this.id = domain.id;
    this.name = domain.name;
    this.belongs = domain.belongs;
}

module.exports = Domain;

// Add a domain to database
Domain.prototype.save = function(callback) {
    var domain = {
        id: this.id,
        name: this.name,
        belongs: this.belongs
    };

    // insert to MySQL
    mysql.getConnection(function(err, myConnection) {
        if (err) {
            return (err);
        }
        myConnection.query('INSERT INTO `domains` SET ?', {
            "name": domain.name,
            "type": config.powertype
        }, function(err, result) {
            if (err) return (err);
            // Init domain with NS records.
            // TODO Add SOA records
            domain.id = result.insertId;
            async.eachSeries(config.powerservers, function(nsServer, callback) {
                myConnection.query('INSERT INTO `records` SET ?', {
                    "domain_id": domain.id,
                    "name": domain.name,
                    "type": "NS",
                    "content": nsServer,
                    "ttl": 600
                }, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }, function(err) {
                if (err) {
                    return callback(err);
                }
                myConnection.query('INSERT INTO `records` SET ?', {
                    "domain_id": domain.id,
                    "name": domain.name,
                    "type": "SOA",
                    "content": config.powerservers[0] + ' ' + config.adminMail + ' ' + Math.round((new Date()).getTime() / 1000) + ' 3600 360 1209600 180',
                    "ttl": 600
                });
                myConnection.release();
            });

            // console.log(domain);
            // insert to MongoDB
            mongoclient.open(function(err, mongoclient) {
                if(err) {
                    return callback(err);
                }
                var db = mongoclient.db(config.mongodb);
                db.collection('domains', function(err, collection) {
                    if(err) {
                        mongoclient.close;
                        return callback(err);
                    }
                    // Make sure domain has 'id'
                    // console.log(domain.id);
                    // insert new domain to collection.
                    collection.insert(domain, {safe: true}, function(err, domain) {
                        mongoclient.close();
                        callback(err, domain); // return user data if success.
                    });
                });
            });
        });
    });
};

Domain.check = function(name, callback) {
    //open database.
    mongoclient.open(function(err, mongoclient) {
        if(err) {
            return callback(err);
        }
        var db = mongoclient.db(config.mongodb);
        // read users collection.
        db.collection('domains', function(err, collection) {
            if(err) {
                mongoclient.close();
                return callback(err);
            }
            collection.findOne({
                "name": name
            }, function(err, doc) {
                if(doc) {
                    mongoclient.close();
                    var domain = new Domain(doc);
                    // console.log(user);
                    callback(err, domain); // query success, return user data.
                } else {
                    mongoclient.close();
                    callback(err, null); // query failed, return null.
                }
            });
        });
    });
};

Domain.checkOwner = function(domain, user, callback) {
    //open database.
    mongoclient.open(function(err, mongoclient) {
        if(err) {
            return callback(err);
        }
        var db = mongoclient.db(config.mongodb);
        // read users collection.
        db.collection('domains', function(err, collection) {
            if(err) {
                mongoclient.close();
                return callback(err);
            }
            collection.findOne({
                "name": domain,
                "belongs": user
            }, function(err, doc) {
                if(doc) {
                    mongoclient.close();
                    var domain = new Domain(doc);
                    // console.log(user);
                    callback(err, domain); // query success, return user data.
                } else {
                    mongoclient.close();
                    callback(err, null); // query failed, return null.
                }
            });
        });
    });
};

Domain.getList = function(username, callback) {
    mongoclient.open(function (err, mongoclient) {
        if (err) {
            return callback(err);
        }
        var db = mongoclient.db(config.mongodb);
        db.collection('domains', function(err, collection) {
            if (err) {
                mongoclient.close();
                return callback(err);
            }
            // return array containing domain name only
            collection.find({
                "belongs": username
            }, {
                "id": 1,
                "name": 1
            }).toArray(function(err, docs) {
                    if (err) {
                        callback(err, null);
                    }
                    mongoclient.close();
                    callback(null, docs);
            });
        });
    });
};

Domain.remove = function(domainId, user, callback) {
    // console.log(domainId);
    // console.log(user);
    // Delete from mongodb first
    mongoclient.open(function(err, mongoclient) {
        // console.log(err);
        if(err) {
            return callback(err);
        }
        var db = mongoclient.db(config.mongodb);
        // read users collection.
        db.collection('domains', function(err, collection) {
            // console.log(err);
            if(err) {
                mongoclient.close();
                return callback(err);
            }
            collection.remove({
                "id": domainId,
                "belongs": user
            }, true, function(err) {
                // console.log(err);
                if(err) {
                    mongoclient.close();
                    return callback(err);
                }
                mongoclient.close();
                // console.log("executed");
                // delete from MySQL
                mysql.getConnection(function(err, myConnection) {
                    if (err) {
                        // console.log(err);
                        return (err);
                    }
                    myConnection.query('DELETE FROM `domains` WHERE ?', {
                        "id": domainId
                    }, function(err, result) {
                        if (err) return (err);
                        // console.log(result);
                        myConnection.release();
                    });
                    myConnection.query('DELETE FROM `records` WHERE ?', {
                        "domain_id": parseInt(domainId)
                    }, function(err, result) {
                        if (err) return (err);
                        // console.log(result);
                        myConnection.release();
                    });
                });
                callback(null);
            });
        });
    });
};
