var mysql = require('./mysql.js'),
    mongodb = require('./mongodb.js'),
    config = require('../config.js');


// MySQL struct: id, domain_id, name, type, content, ttl, prio, change_date
function Record(record) {
    this.id = record.id;
    this.domainId = record.domainId;
    this.name = record.name;
    this.type = record.type;
    this.content = record.content;
    this.ttl = record.ttl;
    this.prio = record.prio;
    this.changeDate = record.changeDate;
}

module.exports = Record;

Record.prototype.save = function(callback) {
    var record = {
        id: this.id,
        domainId: this.domainId,
        name: this.name,
        type: this.type,
        content: this.content,
        ttl: this.ttl,
        prio: this.prio,
        changeDate: this.changeDate
    };

    mysql.getConnection(function(err, myConnection) {
        if (err) {
            return (err);
        }
        myConnection.query("INSERT INTO `records` SET ?", {
            "domain_id": record.domainId,
            "name": record.name,
            "type": record.type,
            "content": record.content,
            "ttl": record.ttl,
            "prio": record.prio
        }, function(err, result) {
            if (err) {
                return (err);
            }
            // console.log(result);
            // var insertId = parseInt(result.insertId);
            // console.log(insertId);
            // SOA content: config.powerservers[0] + ' ' + config.adminMail + ' 0 3600 360 1209600 ' + config.powerttl
            // UNIX_TIMESTAMP in Javascript: var ts = Math.round((new Date()).getTime() / 1000);
            var SOAcontent = config.powerservers[0] + ' ' + config.adminMail + ' ' + Math.round((new Date()).getTime() / 1000) + ' 3600 360 1209600 180';
            myConnection.query("UPDATE `records` SET ? WHERE `domain_id` = ? AND `type` = 'SOA'", [{
                "content": SOAcontent
            }, parseInt(record.domainId)], function(err, resultSOA) {
                // console.log(resultSOA);
                if (err) {
                    myConnection.release();
                    return (err);
                }
                // console.log(result2);
                myConnection.release();
                callback(result);
            });
            // console.log(result);
        });
    });
};


Record.getList = function(domainId, callback) {
    mysql.getConnection(function(err, myConnection) {
        if (err) {
            myConnection.release();
            return (err);
        }
        // console.log(domainId);
        myConnection.query("SELECT * FROM `records` WHERE ?", {
            "domain_id": domainId
        }, function(err, result) {
            if (err) {
                myConnection.release();
                return callback(err, null);
            }
            myConnection.release();
            // console.log(result);
            callback(null, result);
        });
    });
};

// Check for exist record.
Record.check = function(record, callback) {
    mysql.getConnection(function(err, myConnection) {
        if (err) {
            myConnection.release();
            return (err);
        }
        myConnection.query("SELECT * FROM `records` WHERE `domain_id` = ? AND `name` = ? AND `type` = ? AND `content` = ?", [
            record.domainId, record.name, record.type, record.content
        ], function(err, result) {
            if (err) {
                myConnection.release();
                return callback(err, null);
            }
            // console.log(result)
            myConnection.release();
            callback(null, result);
        });
    });
}

Record.delete = function(recordId, callback) {
    mysql.getConnection(function(err, myConnection) {
        if (err) {
            myConnection.release();
            return (err);
        }

        myConnection.query("DELETE FROM `records` WHERE ?", {
            "id": recordId
        }, function(err, result) {
            if (err) {
                myConnection.release();
                return callback(err, null);
            }
            myConnection.release();
            callback(null, result);
        });
    });
}

Record.edit = function(record, callback) {
    // console.log(record);
    mysql.getConnection(function(err, myConnection) {
        if (err) {
            myConnection.release();
            return (err);
        }
        myConnection.query("UPDATE `records` SET ? WHERE `id` = ? AND `domain_id` = ?", [{
            "name": record.name,
            "type": record.type,
            "content": record.content,
            "ttl": record.ttl,
            "prio": record.prio
        }, record.id, record.domainId ], function(err, result) {
	    // console.log(result)
            if (err) {
                myConnection.release();
                return callback(err, null);
            }
            // return error message if record is not under specific domain.
            // console.log(typeof(result.changedRows));
            if(result.affectedRows === 0) {
                myConnection.release();
                return callback(null, null);
            }

            // console.log(result);
            // var insertId = parseInt(record.domainId);
            var SOAcontent = config.powerservers[0] + ' ' + config.adminMail + ' ' + Math.round((new Date()).getTime() / 1000) + ' 3600 360 1209600 180';
            myConnection.query("UPDATE `records` SET ? WHERE `domain_id` = ? AND `type` = 'SOA'", [{
                "content": SOAcontent
            }, parseInt(record.domainId)], function(err, resultSOA) {
                // console.log(resultSOA);
                if (err) {
                    myConnection.release();
                    return (err);
                }
                myConnection.release();
            });
            // console.log(result.message);
            callback(null, result);
        });
    });
}