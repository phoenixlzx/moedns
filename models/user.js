var config = require('../config.js'),
    mongoclient = require('./mongodb.js');

function User(user) {
    this.name = user.name;
    this.email = user.email;
    this.password = user.password;
    this.role = user.role;
}

module.exports = User;

// save user data.
User.prototype.save = function(callback) {
    // user infomation to save.
    var user = {
        name: this.name,
        email: this.email,
        password: this.password,
        role: "user"
    };
    // open database.
    mongoclient.open(function(err, mongoclient) {
        var db = mongoclient.db(config.mongodb);
        if(err) {
            return callback(err);
        }

        // read user collection.
        db.collection('users', function(err, collection) {
            if(err) {
                mongoclient.close;
                return callback(err);
            }
            // insert user data to collection.
            collection.insert(user, {safe: true}, function(err, user) {
                mongoclient.close();
                callback(err, user); // return user data if success.
            });
        });
    });
};

// read user data.
User.get = function(name, callback) {
    //open database.
    mongoclient.open(function(err, mongoclient) {
        var db = mongoclient.db(config.mongodb);
        if(err) {
            return callback(err);
        }
        // read users collection.
        db.collection('users', function(err, collection) {
            if(err) {
                mongoclient.close();
                return callback(err);
            }
            collection.findOne({
                name: name
            }, function(err, doc) {
                // console.log(doc);
                mongoclient.close();
                if(doc) {
                    var user = new User(doc);
                    callback(err, user); // query success, return user data.
                } else {
                    callback(err, null); // query failed, return null.
                }
            });
        });
    });
};

User.check = function(name, email, callback) {
    //open database.
    mongoclient.open(function(err, mongoclient) {
        var db = mongoclient.db(config.mongodb);
        if(err) {
            return callback(err);
        }
        // read users collection.
        db.collection('users', function(err, collection) {
            if(err) {
                mongoclient.close();
                return callback(err);
            }
            collection.findOne({ $or : [
                {name: name},
                {email: email}
            ]}, function(err, doc) {
                mongoclient.close();
                if(doc) {
                    var user = new User(doc);
                    // console.log(user);
                    callback(null, user); // query success, return user data.
                } else {
                    callback(err, null); // query failed, return null.
                }
            });
        });
    });
};

User.edit = function(user, callback) {
    mongoclient.open(function(err, mongoclient) {
        var db = mongoclient.db(config.mongodb);
        if (err) {
            return callback(err);
        }
        db.collection('users', function(err, collection) {
            if (err) {
                mongoclient.close();
                return callback(err);
            }
            collection.update({"name":user.name}, {$set : {
                "name": user.name,
                "password": user.password,
                "email": user.email
                // "role": user.role
            }}, function(err) {
                if (err) {
                    mongoclient.close();
                    return callback(err);
                }
                mongoclient.close();
                callback(err, user);
            });
        });
    });
};

User.delete = function(username, callback) {
    mongoclient.open(function(err, mongoclient) {
        var db = mongoclient.db(config.mongodb);
        if (err) {
            return callback(err);
        }
        db.collection('users', function(err, collection) {
            if (err) {
                mongoclient.close();
                return callback(err);
            }
            collection.remove({"name":username}, function(err) {
                if (err) {
                    mongoclient.close();
                    return callback(err);
                }
                mongoclient.close();
                callback(null);
            });
        });
    })
}

// TODO Add user-specified TTL.