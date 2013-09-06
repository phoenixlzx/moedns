/*
*
* Routes
*
* */

// Module dependencies
var config = require('../config.js'),
    crypto = require('crypto'),
    User = require('../models/user.js'),
    Admin = require('../models/admin.js'),
    Domain = require('../models/domain.js'),
    Record = require('../models/record.js'),
    check = require('validator').check,
    sanitize = require('validator').sanitize,
    tld = require('tldjs');
    // dns = require('dns');

// function to test a object is empty.
// Via http://stackoverflow.com/questions/4994201/is-object-empty
var hasOwnProperty = Object.prototype.hasOwnProperty;
Object.prototype.isEmpty = function(obj) {
    // null and undefined are empty
    if (obj == null) return true;
    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length && obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    for (var key in obj) {
        if (hasOwnProperty.call(obj, key))    return false;
    }

    return true;
}


// Route functions
module.exports = function(app) {

    app.get('/', function(req, res) {
        res.render('index', {
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            title: res.__('HOME') + ' - ' + config.siteName,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    /* User routes */
    // Registration
    app.get('/reg', checkNotLogin, function(req, res) {
        if (!config.allowReg) {
            res.redirect('/');
            return req.flash(res.__("REG_NOT_ALLOWED"));
        }
        res.render('reg',{
            title: res.__('REGISTER') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            allowReg: config.allowReg,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/reg', checkNotLogin, function(req,res){
        if (!config.allowReg) {
            res.redirect('/');
            return req.flash(res.__("REG_NOT_ALLOWED"));
        }
        var name = req.body.username,
            mail = req.body.email,
            password = req.body.password,
            repeatPassword = req.body['password-repeat'];

        try {
            check(name, 'USERNAME_EMPTY').notEmpty();
            check(name, 'USERNAME_ALPHANUMERIC').isAlphanumeric();
            check(password, 'PASSWORD_EMPTY').notEmpty();
            check(repeatPassword, 'PASSWORD_NOT_EQUAL').equals(password);
            check(mail, 'EMAIL_INVALID').len(4, 64).isEmail();
        } catch (e) {
            req.flash('error', res.__(e.message));
            return res.redirect('/reg');
        }

        // get password hash
        var hash = crypto.createHash('sha256'),
            password = hash.update(req.body.password).digest('hex');
        var newUser = new User({
            name: name,
            password: password,
            email: mail
        });
        // check if username exists.
        User.check(newUser.name, newUser.email, function(err, user){
            console.log(user);
            if(user) {
                err = 'USER_EXISTS';
            }
            if(err) {
                req.flash('error', res.__(err));
                return res.redirect('/reg');
            }
            newUser.save(function(err){
                if(err){
                    req.flash('error',err);
                    return res.redirect('/reg');
                }
                req.session.user = newUser; // store user information to session.
                req.flash('success',res.__('REG_SUCCESS'));
                res.redirect('/');
            });
        });
    });

    // Login/logout
    app.get('/login', checkNotLogin, function(req,res){
        res.render('login',{
            title: res.__('LOGIN') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    // TODO password recovery.
    app.post('/login', checkNotLogin, function(req, res){
        // Generate password hash
        var hash = crypto.createHash('sha256'),
            password = hash.update(req.body.password).digest('hex');
        // check login details
        User.get(req.body.username, function(err, user) {
            if(!user || user.password != password) {
                req.flash('error', res.__('LOGIN_FAIL'));
                return res.redirect('/login');
            }
            // Login success, store user information to session.
            req.session.user = user;
            req.flash('success', res.__('LOGIN_SUCCESS'));
            res.redirect('/');
        });
    });

    app.post('/logout', checkLogin, function(req, res) {
        req.session.user = null;
        req.flash('success',res.__('LOGOUT_SUCCESS'));
        res.redirect('/');
    });

    app.get('/account', checkLogin, function(req, res) {
        res.render('account',{
            title: res.__('MY_ACCOUNT') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/account', checkLogin, function(req, res) {
        var email = req.body.email,
            hash = crypto.createHash('sha256'),
            password = hash.update(req.body.password).digest('hex'),
            newPassword = req.body.newpass,
            repeatPassword = req.body['password-repeat'],
            inputError = '';

        if (password != req.session.user.password) {
            inputError = 'WRONG_PASSWORD';
        }
        if (repeatPassword || newPassword) {
            var hash = crypto.createHash('sha256'),
                newPassword = hash.update(newPassword).digest('hex');
            var hash = crypto.createHash('sha256'),
                repeatPassword = hash.update(repeatPassword).digest('hex');
            if (repeatPassword != newPassword) {
                inputError = 'PASSWORD_NOT_EQUAL';
            }
            password = newPassword;
        }

        try {
            check(email, 'EMAIL_INVALID').len(4, 64).isEmail();
        } catch (e) {
            inputError = e.message;
        }

        if (inputError) {
            req.flash('error', res.__(inputError));
            return res.redirect('/account');
        }

        var newUser = new User({
            name: req.session.user.name,
            email: email,
            password: password
        });

        User.edit(newUser, function(err, user){
            if(err) {
                req.flash('error', res.__(err));
                return res.redirect('/me');
            }
            req.flash('success', res.__('USER_UPDATED'));
            req.session.user = null;
            res.redirect('/login');
        });
    });


    /* Domain routes */
    // List domains under a user
    app.get('/domains', checkLogin, function(req, res) {
       Domain.getList(req.session.user.name, function(err, domains) {
           if(err){
               req.flash('error',err);
               return res.redirect('/domains');
           }
           res.render('domains', {
               title: res.__('MY_DOMAINS') + ' - ' + config.siteName,
               siteName: config.siteName,
               siteTagline: config.siteTagline,
               allowReg: config.allowReg,
               user: req.session.user,
               domains: domains,
               powerservers: config.powerservers,
               success: req.flash('success').toString(),
               error: req.flash('error').toString()
           });
       })
    });

    // Add domain
    app.post('/add-domain', checkLogin, function(req, res) {
        // Validate whether user input is root domain name.
        var newDomain = new Domain({
            name: req.body.domain,
            belongs: req.session.user.name
        });
        if (tld.getDomain(newDomain.name) == newDomain.name && tld.tldExists(newDomain.name)) {
            // Domain valid, check if domain exists in db.
            Domain.check(newDomain.name, function(err, data) {
                if (data) {
                    console.log(data);
                    // Domain exists, return error.

                    req.flash('error', res.__('DOMAIN_EXISTS'));
                    return res.redirect('/domains');
                } else {
                    // Domain not exist, insert into database.
                    newDomain.save(function(err) {
                        if (err) {
                            res.redirect('/domains');
                            return req.flash('error',err);
                        }
                        req.flash('success',res.__('ADD_DOMAIN_SUCCESS'));
                        res.redirect('/domains');
                    });
                }
            });
        } else {
            req.flash('error', res.__('DOMAIN_NOT_VALID'));
            return res.redirect('/domains');
        }
    });

    // Remove a domain
    app.post('/domain/:domain/delete', checkLogin, function(req, res) {
        var domain = req.params.domain,
            id = parseInt(req.body.domainId),
            user = req.session.user;
        // console.log(id);
        // console.log(domain);
        // console.log(user.name);
        Domain.checkOwner(domain, user.name, function(err, doc) {
            // console.log(doc);
            if (err) {
                req.flash('error', err);
                return res.redirect('/domains');
            }
            if (doc == null) {
                req.flash('error', res.__('DOMAIN_NOT_OWNED'));
                return res.redirect('/domains');
            } else {
                Domain.remove(id, user.name, function(err) {
                    if (err) {
                        req.flash('error', err);
                        return res.redirect('/domains');
                    }
                    req.flash('success', res.__('DOMAIN_DELETED'));
                    res.redirect('/domains');
                });
            }
        });

    });

    app.get('/domain/:domain', checkLogin, function(req, res) {
       var domain = req.params.domain,
           user = req.session.user;
       Domain.checkOwner(domain, user.name, function(err, doc) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/domains');
            }
            if (doc == null) {
                req.flash('error', res.__('DOMAIN_NOT_OWNED'));
                return res.redirect('/domains');
            } else {
                // Get domain records
                // console.log(doc);
                Record.getList(doc.id, function(err, records) {
                    if (err) {
                        req.flash('error', err);
                        return res.redirect('/domains');
                    }
                    // console.log(records);
                    res.render('records', {
                        title: res.__('DOMAIN') + ': ' + domain.toUpperCase() + ' - ' + config.siteName,
                        siteName: config.siteName,
                        siteTagline: config.siteTagline,
                        allowReg: config.allowReg,
                        user: req.session.user,
                        domain: doc,
                        powerservers: config.powerservers,
                        records: records,
                        success: req.flash('success').toString(),
                        error: req.flash('error').toString()
                    });
                });
            }
       });

    });


    /*
    * Record routes
    * */
    // Add a record.
    app.post('/domain/:domain/add-record', checkLogin, function(req, res) {
        // console.log(req.body);
        var type = req.body.type,
            name = req.body.name + '.' + req.params.domain,
            ttl = req.body.ttl,
            prio = req.body.prio,
            content = req.body.content;

        // TODO Check user inputs for record validity
        // Better RegEx required.
        try {
            check(type, 'TYPE_ERROR').isIn([
                "A",
                "AAAA",
                "CNAME",
                "NS",
                "MX",
                "SRV",
                "TXT"
            ]);
            check(ttl, 'TTL_ERROR').isDecimal().min(60);
            switch (type) {
                case "A":
                    check(content, 'NEED_IPV4').isIPv4();
                    prio = null;
                    break;
                case "AAAA":
                    check(content, 'NEED_IPV6').isIPv6();
                    prio = null;
                    break;
                case ("CNAME" || "NS"):
                    if (tld.isValid(content) && tld.tldExists(content)) {
                        prio = null;
                    } else {
                        throw new Error("VALUE_ERROR");
                    }
                    break;
                case "MX":
                    if (tld.isValid(content) && tld.tldExists(content)) {
                    /*  Better DNS check module needed.
                        dns.resolve(content, function(err, addresses) {
                            console.log(addresses);
                            if (addresses === undefined) {
                                throw new Error("NEED_A_RECORD");
                            } else {

                            }
                        });
                    */
                    } else {
                        throw new Error("VALUE_ERROR");
                    }
                    check(prio, 'PRIO_ERROR').isDecimal().max(100).min(1);
                    break;
                case "SRV":
                    prio = null;
                    break;
                case "TXT":
                    prio = null;
                    break;
                default:
                    throw new Error("TYPE_ERROR");
            }
        } catch (e) {
            console.log(e);
            req.flash('error', res.__(e.message));
            return res.redirect('/domain/' + req.params.domain);
        }

        Domain.checkOwner(req.params.domain, req.session.user.name, function(err, doc) {
            // console.log(doc);
            if (err) {
                // console.log(err);
                // req.flash('error', err);
                return res.redirect('/domain/' + req.params.domain);
            }
            if (doc == '') {
                // console.log(err);
                req.flash('error', res.__('DOMAIN_NOT_OWNED'));
                return res.redirect('/domains');
            } else {
                // console.log(content);
                var newRecord = new Record({
                    domainId: doc.id,
                    name: name,
                    type: type,
                    content: content,
                    ttl: ttl,
                    prio: prio
                });
                // console.log(newRecord);

                // Check for duplicate record
                Record.check(newRecord, function(err, result) {
                    // console.log(err);
                    // console.log(result)
                    // console.log(JSON.stringify(result));
                    if (err) {
                        req.flash("error", err);
                        return res.redirect('/domain/' + req.params.domain);
                    }
                    if (isEmpty(result)) {
                        // Add new record to db.
                        newRecord.save(function(saveResult) {
                            // console.log(err);
                            // console.log(saveResult);
                            // if (err) {
                            //    // console.log(err);
                            //    req.flash('error', err);
                            //    return res.redirect('/domain/' + req.params.domain);
                            // }
                            req.flash('success', res.__('ADD_RECORD_SUCCESS'));
                            res.redirect('/domain/' + req.params.domain);
                        });
                    } else {
                        req.flash('error', res.__('DUPLICATE_RECORD'));
                        return res.redirect('/domain/' + req.params.domain);
                    }
                });
            }
        });
    });

    // Remove a record
    app.post('/domain/:domain/delete-record', checkLogin, function(req, res) {
        var domain = req.params.domain,
            record = parseInt(req.body.recordId),
            user = req.session.user;
        Domain.checkOwner(domain, user.name, function(err, doc) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/domains');
            }
            if (doc == null) {
                req.flash('error', res.__('DOMAIN_NOT_OWNED'));
                return res.redirect('/domains');
            } else {
                Record.delete(record, function(err) {
                    if (err) {
                        req.flash('error', err);
                        return res.redirect('/domain/' + domain);
                    }
                    req.flash('success', res.__('RECORD_DELETED'));
                    res.redirect('/domain/' + domain);
                });
            }
        });
    });

    // Edit a record
    app.post('/domain/:domain/edit-record', checkLogin, function(req, res) {
        var domain = req.params.domain,
            user = req.session.user;
        Domain.checkOwner(domain, user.name, function(err, doc) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/domains');
            }
            if (doc == null) {
                req.flash('error', res.__('DOMAIN_NOT_OWNED'));
                return res.redirect('/domains');
            } else {
                // Validate user input and update record.
                var id = req.body.recordId,
                    type = req.body.type,
                    name = req.body.name + '.' + req.params.domain,
                    ttl = req.body.ttl,
                    prio = req.body.prio,
                    content = req.body.content;
                // TODO Check user inputs for record validity
                // Better RegEx required.
                try {
                    check(type, 'TYPE_ERROR').isIn([
                        "A",
                        "AAAA",
                        "CNAME",
                        "NS",
                        "MX",
                        "SRV",
                        "TXT"
                    ]);
                    check(ttl, 'TTL_ERROR').isDecimal().min(60);
                    switch (type) {
                        case "A":
                            check(content, 'NEED_IPV4').isIPv4();
                            prio = null;
                            break;
                        case "AAAA":
                            check(content, 'NEED_IPV6').isIPv6();
                            prio = null;
                            break;
                        case ("CNAME" || "NS"):
                            if (tld.isValid(content) && tld.tldExists(content)) {
                                prio = null;
                            } else {
                                throw new Error("VALUE_ERROR");
                            }
                            break;
                        case "MX":
                            if (tld.isValid(content) && tld.tldExists(content)) {
                                /*  Better DNS check module needed.
                                 dns.resolve(content, function(err, addresses) {
                                 console.log(addresses);
                                 if (addresses === undefined) {
                                 throw new Error("NEED_A_RECORD");
                                 } else {

                                 }
                                 });
                                 */
                            } else {
                                throw new Error("VALUE_ERROR");
                            }
                            check(prio, 'PRIO_ERROR').isDecimal().max(100).min(1);
                            break;
                        case "SRV":
                            prio = null;
                            break;
                        case "TXT":
                            prio = null;
                            break;
                        default:
                            throw new Error("TYPE_ERROR");
                    }
                } catch (e) {
                    console.log(e);
                    req.flash('error', res.__(e.message));
                    return res.redirect('/domain/' + req.params.domain);
                }
                var newRecord = new Record({
                    id: id,
                    name: name,
                    type: type,
                    content: content,
                    ttl: ttl,
                    prio: prio
                });
                Record.edit(newRecord, function(err) {
                    if (err) {
                        req.flash('error', err);
                        return res.redirect('/domain/' + domain);
                    }
                    req.flash('success', res.__('RECORD_UPDATED'));
                    res.redirect('/domain/' + domain);
                });
            }
        });
    })



    /* Default 404 page
    app.all('/', function(req, res) {
        res.send(404, "The page cannot be found. :-(");
    });
     */

    // Session functions
    function checkLogin(req, res, next) {
        if(!req.session.user){
            req.flash('error',res.__('LOGIN_NEEDED'));
            return res.redirect('/login');
        }
        next();
    }

    function checkNotLogin(req,res,next) {
        if(req.session.user){
            req.flash('error',res.__('ALREADY_LOGIN'));
            return res.redirect('/');
        }
        next();
    }

};