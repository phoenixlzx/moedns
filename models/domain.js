/*
* Domain functions
*
* */

var config = require('../config.js'),
    mongodb = require('./mongodb.js'),
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
            config.powerservers.forEach(function(nsServer) {
                myConnection.query('INSERT INTO `records` SET ?', {
                    "domain_id": domain.id,
                    "name": "@." + domain.name,
                    "type": "NS",
                    "content": nsServer,
                    "ttl": config.powerttl
                });
            });

            myConnection.release();

            // console.log(domain);
            // insert to MongoDB
            mongodb.open(function(err, db) {
                if(err) {
                    return callback(err);
                }
                db.collection('domains', function(err, collection) {
                    if(err) {
                        mongodb.close;
                        return callback(err);
                    }
                    // Make sure domain has 'id'
                    console.log(domain.id);
                    // insert new domain to collection.
                    collection.insert(domain, {safe: true}, function(err, domain) {
                        mongodb.close();
                        callback(err, domain); // return user data if success.
                    });
                });
            });
        });
    });
};

Domain.check = function(name, callback) {
    //open database.
    mongodb.open(function(err, db) {
        if(err) {
            return callback(err);
        }
        // read users collection.
        db.collection('domains', function(err, collection) {
            if(err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "name": name
            }, function(err, doc) {
                if(doc) {
                    mongodb.close();
                    var domain = new Domain(doc);
                    // console.log(user);
                    callback(err, domain); // query success, return user data.
                } else {
                    mongodb.close();
                    callback(err, null); // query failed, return null.
                }
            });
        });
    });
};

Domain.checkOwner = function(domain, user, callback) {
    //open database.
    mongodb.open(function(err, db) {
        if(err) {
            return callback(err);
        }
        // read users collection.
        db.collection('domains', function(err, collection) {
            if(err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "name": domain,
                "belongs": user
            }, function(err, doc) {
                if(doc) {
                    mongodb.close();
                    var domain = new Domain(doc);
                    // console.log(user);
                    callback(err, domain); // query success, return user data.
                } else {
                    mongodb.close();
                    callback(err, null); // query failed, return null.
                }
            });
        });
    });
};

Domain.getList = function(username, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('domains', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // return array containing domain name only
            collection.find({
                "belongs": username
            }, {
                "id": 1,
                "name": 1
            }).toArray(function(err, docs) {
                    mongodb.close();
                    if (err) {
                        callback(err, null);
                    }
                    callback(null, docs);
            });
        });
    });
};

Domain.remove = function(domainId, user, callback) {
    // console.log(domainId);
    // console.log(user);
    // Delete from mongodb first
    mongodb.open(function(err, db) {
        // console.log(err);
        if(err) {
            return callback(err);
        }
        // read users collection.
        db.collection('domains', function(err, collection) {
            // console.log(err);
            if(err) {
                mongodb.close();
                return callback(err);
            }
            collection.remove({
                "id": domainId,
                "belongs": user
            }, true, function(err) {
                // console.log(err);
                if(err) {
                    mongodb.close();
                    return callback(err);
                }
                mongodb.close();
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
                        "domain_id": domainId
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