var mongodb = require('./mongodb.js');

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
    mongodb.open(function(err, db) {
        if(err) {
            return callback(err);
        }

        // read user collection.
        db.collection('users', function(err, collection) {
            if(err) {
                mongodb.close;
                return callback(err);
            }
            // insert user data to collection.
            collection.insert(user, {safe: true}, function(err, user) {
                mongodb.close();
                callback(err, user); // return user data if success.
            });
        });
    });
};

// read user data.
User.get = function(name, callback) {
    //open database.
    mongodb.open(function(err, db) {
        if(err) {
            return callback(err);
        }
        // read users collection.
        db.collection('users', function(err, collection) {
            if(err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                name: name
            }, function(err, doc) {
                mongodb.close();
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
    mongodb.open(function(err, db) {
        if(err) {
            return callback(err);
        }
        // read users collection.
        db.collection('users', function(err, collection) {
            if(err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({ $or : [
                {name: name},
                {email: email}
            ]}, function(err, doc) {
                if(doc) {
                    mongodb.close();
                    var user = new User(doc);
                    // console.log(user);
                    callback(err, user); // query success, return user data.
                } else {
                    mongodb.close();
                    callback(err, null); // query failed, return null.
                }
            });
        });
    });
};

User.edit = function(user, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('users', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.update({"name":user.name}, {$set : {
                "name": user.name,
                "password": user.password,
                "email": user.email,
                "role": user.role
            }}, function(err) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                mongodb.close();
                callback(err, user);
            });
        });
    });
};

// TODO Add user-specified TTL.