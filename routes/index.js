/*
*
* Routes
*
* */

// Module dependencies
var config = require('../config.js'),
    crypto = require('crypto'),
    net = require('net'),
    async = require('async'),
    hat = require('hat'),
    User = require('../models/user.js'),
    Admin = require('../models/admin.js'),
    Domain = require('../models/domain.js'),
    Record = require('../models/record.js'),
    check = require('validator').check,
    sanitize = require('validator').sanitize,
    tld = require('tldjs'),
    nodemailer = require("nodemailer");
    // dns = require('dns');

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP", {
    service: config.serviceMailSMTP,
    // host: "smtp.moedns.com", // hostname
    //secureConnection: true, // use SSL
    // port: 465, // port for secure SMTP
    auth: {
        user: config.serviceMailUser,
        pass: config.serviceMailPass
    }
});

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

    app.get('/', csrf, function(req, res) {
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
    app.get('/reg', csrf, checkNotLogin, function(req, res) {
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

    app.post('/reg', csrf, checkNotLogin, function(req,res){
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
            email: mail,
            activekey: hat(),
            role: 'inactive'
        });
        // check if username exists.
        User.check(newUser.name, newUser.email, function(err, user){
            // console.log(user);
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
                // Send verification Email.
                var activeLink = 'http://' + config.url + '/activate?activekey=' + newUser.activekey;
                if (config.ssl) {
                    activeLink = 'https://' + config.url + '/activate?activekey=' + newUser.activekey;
                }
                // console.log(activeLink);
                var mailOptions = {
                    from: config.serviceMailSender, // sender address
                    to: newUser.email, // list of receivers
                    subject: res.__('USER_VERIFICATION') + ' - ' + config.siteName, // Subject line
                    text: res.__('USER_VERIFICATION_BODY', newUser.name, config.siteName, activeLink)
                }
                // console.log(mailOptions.text);
                // send mail with defined transport object
                smtpTransport.sendMail(mailOptions, function(err, response) {
                    // console.log('executed');
                    if (err) {
                        console.log(err);
                    }
                    smtpTransport.close();
                    // req.session.user = newUser; // store user information to session.
                    req.flash('success',res.__('REG_AWAITING_VERIFICATION'));
                    res.redirect('/');
                });

            });
        });
    });

    // User activation
    app.get('/activate', checkNotLogin, function(req, res) {
        var activekey = req.query.activekey;
        User.checkActivekey(activekey, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }

            if (!user) {
                req.flash('error', res.__('USER_ACTIVATED_NOT_EXIST'));
                return res.redirect('/');
            }

            User.activate(activekey, function(err) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                req.session.user = user;
                req.flash('success', res.__('USER_ACTIVATED'));
                res.redirect('/');
            })
        });
    });

    // Login/logout
    app.get('/login', csrf, checkNotLogin, function(req,res){
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

    app.post('/login', csrf, checkNotLogin, function(req, res){
        // Generate password hash
        var hash = crypto.createHash('sha256'),
            password = hash.update(req.body.password).digest('hex');
        // check login details
        try {
            check(req.body.username, 'USERNAME_ALPHANUMERIC').isAlphanumeric();
        } catch (e) {
            req.flash('error', res.__(e.message));
            return res.redirect('/login');
        }
        User.get(req.body.username, function(err, user) {
            if (!user) {
                req.flash('error', res.__('LOGIN_FAIL'));
                return res.redirect('/login');
            } else if (user.password != password) {
                // Send warning message.
                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                // setup e-mail data with unicode symbols
                var mailOptions = {
                    from: config.serviceMailSender, // sender address
                    to: user.email, // list of receivers
                    subject: res.__('LOGIN_FAIL_WARNING') + ' - ' + config.siteName, // Subject line
                    text: res.__('LOGIN_FAIL_WARNING_BODY') + ip // plaintext body
                }
                // send mail with defined transport object
                smtpTransport.sendMail(mailOptions, function(err, response) {
                    // console.log('executed');
                    if (err) {
                        console.log(err);
                    }
                    smtpTransport.close();
                    req.flash('error', res.__('LOGIN_FAIL'));
                    return res.redirect('/login');
                });
            } else {
                if (user.role == 'inactive') {
                    req.flash('error', res.__('USER_NOT_ACTIVATED'));
                    return res.redirect('/login');
                } else {
                    req.session.user = user;
                    req.flash('success', res.__('LOGIN_SUCCESS'));
                    res.redirect('/');
                }
            }
        });
    });

    // Password recovery
    app.get('/forgot-password', csrf, checkNotLogin, function(req, res) {
        res.render('forgot-password',{
            title: res.__('RESET_PASSWORD') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/forgot-password', csrf, checkNotLogin, function(req, res) {
        var mail = req.body.email,
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Check email format
        try {
            check(mail, 'EMAIL_INVALID').len(4, 64).isEmail();
        } catch (e) {
            req.flash('error', res.__(e.message));
            return res.redirect('/forgot-password');
        }

        User.check(null, mail, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/forgot-password');
            }
            if (!user) {
                req.flash('error', res.__('USER_NOT_FOUND'));
                return res.redirect('/reset-password');
            }

            // Get user info, generate key then send to user.
            User.createResetkey(user.name, user.email, function(err, resetkey) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/forgot-password');
                }
                // console.log(resetkey);

                var resetLink = 'http://' + config.url + '/reset-password?resetkey=' + resetkey;
                if (config.ssl) {
                    resetLink = 'https://' + config.url + '/reset-password?resetkey=' + resetkey;
                }
                // console.log(resetLink);
                var mailOptions = {
                    from: config.serviceMailSender, // sender address
                    to: user.email, // list of receivers
                    subject: res.__('RESET_PASSWORD') + ' - ' + config.siteName, // Subject line
                    text: res.__('RESET_PASS_BODY_1') + resetLink + res.__('RESET_PASS_BODY_2') + ip // plaintext body
                }
                // send mail with defined transport object
                // console.log(mailOptions.text);
                smtpTransport.sendMail(mailOptions, function(err, response) {
                    // console.log(response);
                    if (err) {
                        console.log(err);
                    }
                    // User.clearResetkey(resetkey);
                    smtpTransport.close();
                    req.flash('success', res.__('RESET_MAIL_SENT'));
                    return res.redirect('/login');
                });
            });
        });

    });

    app.get('/reset-password', csrf, checkNotLogin, function(req, res) {
        res.render('reset-password',{
            title: res.__('RESET_PASSWORD') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/reset-password', csrf, checkNotLogin, function(req, res) {
        var resetkey = req.query.resetkey;

        try {
            check(req.body.password, 'PASSWORD_EMPTY').notEmpty();
            check(req.body['password-repeat'], 'PASSWORD_NOT_EQUAL').equals(req.body.password);
            check(resetkey, 'RESETKEY_INCORRECT').isAlphanumeric().len(32);
        } catch (e) {
            req.flash('error', res.__(e.message));
            return res.redirect('/');
        }

        // get password hash
        var hash = crypto.createHash('sha256'),
            password = hash.update(req.body.password).digest('hex');

        User.checkResetkey(resetkey, function(err, user) {
            if (err) {
                req.flash('error', res.__(err));
                return res.redirect('/');
            }
            if (!user) {
                req.flash('error', res.__('USER_NOT_FOUND'));
                return res.redirect('/');
            }

            var newUser = new User({
                name: user.name,
                password: password,
                email: user.email
            });

            User.edit(newUser, function(err, user){
                if(err) {
                    req.flash('error', res.__(err));
                    return res.redirect('/');
                }
                req.flash('success', res.__('PASSWORD_UPDATED'));
                req.session.user = null;
                res.redirect('/login');
            });

        });

    });

    app.post('/logout', csrf, checkLogin, function(req, res) {
        req.session.user = null;
        req.flash('success',res.__('LOGOUT_SUCCESS'));
        res.redirect('/');
    });

    app.get('/account', csrf, checkLogin, function(req, res) {
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

    app.post('/account', csrf, checkLogin, function(req, res) {
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

        User.check(null, newUser.email, function(err, user){
            // console.log(user);
            if(user && newUser.email != req.session.user.email) {
                err = 'USER_EXISTS';
            }
            if(err) {
                req.flash('error', res.__(err));
                return res.redirect('/reg');
            }

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
    });


    /* Domain routes */
    // List domains under a user
    app.get('/domains', csrf, checkLogin, function(req, res) {
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
    app.post('/add-domain', csrf, checkLogin, function(req, res) {
        // Validate whether user input is root domain name.
        var newDomain = new Domain({
            name: req.body.domain,
            belongs: req.session.user.name
        });
        if (tld.getDomain(newDomain.name) == newDomain.name &&
            tld.tldExists(newDomain.name) &&
            /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/.test(newDomain.name)) {
            // Domain valid, check if domain exists in db.
            Domain.check(newDomain.name, function(err, data) {
                if (data) {
                    // console.log(data);
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
    app.post('/domain/:domain/delete', csrf, checkLogin, function(req, res) {
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

    app.get('/domain/:domain', csrf, checkLogin, function(req, res) {
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
    app.post('/domain/:domain/add-record', csrf, checkLogin, function(req, res) {
        // console.log(req.body);
        var type = req.body.type,
            // name = req.body.name == '@'?req.params.domain:req.body.name + '.' + req.params.domain,
            ttl = req.body.ttl || 3600,
            prio = req.body.prio || null,
            content = req.body.content,
            geo = req.body.geo || null;

        var name = null;
        if (req.body.name == '@' || req.body.name == '') {
            name = req.params.domain;
        } else {
            name = req.body.name + '.' + req.params.domain;
        }

        try {
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
                case ("CNAME"):
                    if (tld.isValid(content) && tld.tldExists(content)) {
                        prio = null;
                    } else {
                        throw new Error("VALUE_ERROR");
                    }
                    break;
                case "NS":
                    if (tld.isValid(content) && tld.tldExists(content)) {
                        prio = null;
                    } else {
                        throw new Error("VALUE_ERROR");
                    }
                    break;
                case "MX":
                    if (tld.isValid(content) && tld.tldExists(content)) {
                        //  Better DNS check module needed.
                        //    dns.resolve(content, function(err, addresses) {
                        //        console.log(addresses);
                        //        if (addresses === undefined) {
                        //            throw new Error("NEED_A_RECORD");
                        //        } else {
                        //
                        //        }
                        //    });
                        //
                    } else {
                        throw new Error("VALUE_ERROR");
                    }
                    check(prio, 'PRIO_ERROR').isDecimal().max(100).min(1);
                    break;
                case "SRV":
                    // _service._proto.name. TTL class SRV priority weight port target.
                    name = "_" + req.body.service + "._" + req.body.protocol + "." + req.params.domain;
                    content = req.body.weight + " " + req.body.port + " " + req.body.content;
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



        // TODO Check user inputs for record validity
        // Better RegEx required.
/*        try {
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
                    //  Better DNS check module needed.
                    //    dns.resolve(content, function(err, addresses) {
                    //        console.log(addresses);
                    //        if (addresses === undefined) {
                    //            throw new Error("NEED_A_RECORD");
                    //        } else {
                    //
                    //        }
                    //    });
                    //
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
*/

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
                    prio: prio,
                    geo: geo
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

    app.get('/addrecordapi', checkLogin, function(req, res) {
        res.render('record-type');
    });

    // Remove a record
    app.post('/domain/:domain/delete-record', csrf, checkLogin, function(req, res) {
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
    app.post('/domain/:domain/edit-record', csrf, checkLogin, function(req, res) {
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
                // console.log(doc);
                // Validate user input and update record.
                var id = parseInt(req.body.recordId),
                    domainId = parseInt(doc.id),
                    type = req.body.type,
                    name = req.body.name == '@'?req.params.domain:req.body.name + '.' + req.params.domain,
                    ttl = req.body.ttl,
                    prio = req.body.prio,
                    geo = req.body.geo||null,
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
                        case "CNAME":
                            if (tld.isValid(content) && tld.tldExists(content)) {
                                prio = null;
                            } else {
                                throw new Error("VALUE_ERROR");
                            }
                            break;
                        case "NS":
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
                    domainId: domainId,
                    name: name,
                    type: type,
                    content: content,
                    ttl: ttl,
                    prio: prio,
                    geo: geo
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

    // Server status
    app.get('/status', csrf, checkLogin, function(req, res) {
        res.render('status', {
            title: res.__('SERVER_STATUS') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            powerservers: config.powerservers,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.get('/statusapi/:server', checkLogin, function(req, res) {
        console.log(req.session.user.name + ' requested status for ' + req.params.server);
        var server = req.params.server,
            status = null,
            sock = new net.Socket();
        sock.setTimeout(3000);
        sock.on('connect', function() {
            console.log(server + ' is up.');
            res.send("0");
            sock.destroy();
        }).on('error', function(e) {
            console.log(server + ' is down: ' + e.message);
            res.send("1");
        }).on('timeout', function(e) {
            console.log(server + ' is down: timeout');
            res.send("2");
        }).connect(5353, server);
    });

    /* About page */
    app.get('/about', csrf, function(req, res) {
        res.render('about', {
            title: res.__('ABOUT') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    /* Help page */
    app.get('/help', csrf, function(req, res) {
        res.render('help', {
            title: res.__('HELP') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });


    /*
    * Contact page
    * */
    app.get('/contact', csrf, function(req, res) {
        res.render('contact', {
            title: res.__('CONTACT') + ' - ' + config.siteName,
            siteName: config.siteName,
            siteTagline: config.siteTagline,
            allowReg: config.allowReg,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/contact', csrf, function(req, res) {
        // Get user IP address.
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        var reply = req.body.email || req.session.user.email,
            subject = req.body.subject + " - " + config.siteName;

        var body = res.__('SENDER_MAIL') + reply + '\n\n' + req.body.message + '\n\n' + res.__('IP_ADDR')  + ip;

        // console.log(ip);
        // console.log(from);
        // console.log(to);
        // console.log(subject);
        // console.log(body);
        if (!req.body.subject || !req.body.message) {
            req.flash('error', res.__('MISSING_FIELD'));
            return res.redirect('/contact');
        }

        try {
            check(reply, 'EMAIL_INVALID').isEmail();
        } catch (e) {
            req.flash('error', res.__(e.message));
            return res.redirect('/contact');
        }
        // console.log(reply);

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: config.serviceMailSender, // sender address
            to: config.adminMail, // list of receivers
            replyTo: reply,
            subject: subject, // Subject line
            text: body // plaintext body
        }

        // console.log('executed');
        // send mail with defined transport object
        smtpTransport.sendMail(mailOptions, function(err, response) {
            // console.log('executed');
            if (err) {
                console.log(err);
                req.flash('error', err);
                return res.redirect('/contact');
            } else {
                req.flash('success', res.__('MSG_SENT'))
                res.redirect('/');
            }

            // if you don't want to use this transport object anymore, uncomment following line
            smtpTransport.close(); // shut down the connection pool, no more messages
        });
    });

    /*
     * APIs
     * */
    app.post('/getapi', csrf, checkLogin, function(req, res) {
        User.createApi(req.session.user.name, function(err, apikey) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/api');
            }
            req.flash('success', res.__('API_GET'));
            res.redirect('/myapi');
        });
    });

    app.get('/myapi', csrf, checkLogin, function(req, res) {
        User.getApi(req.session.user.name, function(err, apikey) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/myapi');
            }
            res.render('api', {
                title: res.__('API_ACCESS') + ' - ' + config.siteName,
                siteName: config.siteName,
                siteTagline: config.siteTagline,
                allowReg: config.allowReg,
                user: req.session.user,
                apikey: apikey,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    // DDNS
    app.get('/api', function(req, res) {
        // console.log(req.query);
        var domain = req.query.domain,
            recordId = req.query.id,
            type = req.query.type.toUpperCase(),
            ip = req.query.ip,
            ttl = req.query.ttl || 60,
            nat = req.query.nat,
            apikey = req.query.key;
        if (nat) {
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        } else {
            ip = req.query.ip;
        }
        if (!apikey) {
            return res.send(401, 'User unauthorized.');
        }
        User.checkApi(apikey, function(err, user) {
            if (err) {
                return res.send(500, 'Server error.');
            }
            if (!user) {
                return res.send(401, 'User unauthorized.');
            } else {
                // console.log(tld.getDomain(domain));
                // console.log(user.name);
                Domain.checkOwner(tld.getDomain(domain), user.name, function(err, doc) {
                    if (err) {
                        return res.send(500, 'Server error.');
                    }
                    if (doc == null) {
                        return res.send(401, 'Domain unauthorized.');
                    } else {
                        // Validate user input and update record.
                        var domainId = parseInt(doc.id),
                            name = domain,
                            prio = null,
                            content = ip;
                        // TODO Check user inputs for record validity
                        // Better RegEx required.
                        try {
                            check(type, 'TYPE_ERROR').isIn([
                                "A",
                                "AAAA"
                            ]);
                            switch (type) {
                                case "A":
                                    check(content, 'NEED_IPV4').isIPv4();
                                    break;
                                case "AAAA":
                                    check(content, 'NEED_IPV6').isIPv6();
                                    break;
                            }
                        } catch (e) {
                            // console.log(e);
                            return res.send(400, 'Bad request.');
                        }
                        var newRecord = new Record({
                            id: recordId,
                            domainId: domainId,
                            name: name,
                            type: type,
                            content: ip,
                            ttl: ttl,
                            prio: prio
                        });
                        Record.edit(newRecord, function(err, result) {
			    // console.log(result);
                            if (err) {
                                return res.send(500, 'Server error.');
			    } else if (!result) {
				return res.send(400, 'Bad request.');
                            } else if (result.changedRows === 0) {
                                return res.send(200, 'Record unchange.');
			    } else {
                                return res.send(200, 'Record updated.');
                            }
                        });
                    }
                });
            }
        });
    });

    /*
    * Admin routes
    * */

    // Admin dashboard
    app.get('/admin', csrf, checkLogin, function(req, res) {
        // console.log(req.session.user);
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            // console.log(user);
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                Admin.stats(function(err, stats) {
                    if (err) {
                        req.flash('error', err);
                    }
                    res.render('admin', {
                        siteName: config.siteName,
                        siteTagline: config.siteTagline,
                        title: res.__('ADMIN_INDEX') + ' - ' + config.siteName,
                        allowReg: config.allowReg,
                        user: req.session.user,
                        stats: stats,
                        success: req.flash('success').toString(),
                        error: req.flash('error').toString()
                    });
                });
            }
        });
    });

     // Get users list
    app.get('/admin/userlist', csrf, checkLogin, function(req, res) {
        var page = req.query.p?parseInt(req.query.p):1,
            limit = req.query.limit?parseInt(req.query.limit):50;
        // Check user has permission to access admin dashbord.
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                Admin.userlist(page, limit, function(err, users) {
                    if(err) {
                        users = [];
                        req.flash('error', err);
                    }
                    // console.log(users.length);
                    res.render('userlist', {
                        siteName: config.siteName,
                        siteTagline: config.siteTagline,
                        title: res.__('USERS_LIST') + ' - ' + config.siteName,
                        allowReg: config.allowReg,
                        user: req.session.user,
                        users: users,
                        paginationData: users,
                        paginationLimit: limit,
                        page: page,
                        success: req.flash('success').toString(),
                        error: req.flash('error').toString()
                    });
                });
            }
        });
    });

    app.post('/admin/adduser', csrf, checkLogin, function(req, res) {
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                var name = req.body.username,
                    mail = req.body.email,
                    password = req.body.password,
                    repeatPassword = req.body['password-repeat'],
                    role = req.body.role;

                try {
                    check(name, 'USERNAME_EMPTY').notEmpty();
                    check(name, 'USERNAME_ALPHANUMERIC').isAlphanumeric();
                    check(password, 'PASSWORD_EMPTY').notEmpty();
                    check(repeatPassword, 'PASSWORD_NOT_EQUAL').equals(password);
                    check(mail, 'EMAIL_INVALID').len(4, 64).isEmail();
                } catch (e) {
                    req.flash('error', res.__(e.message));
                    return res.redirect('/admin/userlist');
                }

                // get password hash
                var hash = crypto.createHash('sha256'),
                    password = hash.update(req.body.password).digest('hex');
                var newUser = new User({
                    name: name,
                    password: password,
                    email: mail,
                    role: role
                });
                // check if username exists.
                User.check(newUser.name, newUser.email, function(err, user){
                    // console.log(user);
                    if(user) {
                        err = 'USER_EXISTS';
                    }
                    if(err) {
                        req.flash('error', res.__(err));
                        return res.redirect('/admin/userlist');
                    }
                    newUser.save(function(err){
                        if(err){
                            req.flash('error',err);
                            return res.redirect('/reg');
                        }
                        req.flash('success',res.__('ADD_USER_SUCCESS'));
                        res.redirect('/admin/userlist');
                    });
                });
            }
        });
    });

    app.post('/admin/deleteuser', csrf, checkLogin, function(req, res) {
        // console.log(req.body.username);
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                Domain.getList(req.body.username, function(err, domains) {
                   if (err) {
                       req.flash('error', err);
                       return res.redirect('/admin/userlist');
                   }
                   // console.log(domains);
                    User.delete(req.body.username, function(err) {
                        if (err) {
                            req.flash('error', err);
                            return res.redirect('/admin/userlist');
                        }
                        async.eachSeries(domains, function(domain, callback) {
                            // console.log(domain);
                            Domain.remove(domain.id, req.body.username, function(err) {
                                if (err) {
                                    req.flash('error', err);
                                    return res.redirect('/admin/userlist');
                                }
                                callback (null);
                            });
                        }, function(err) {
                            if (err) {
                                req.flash('error', err);
                                return res.redirect('/admin/userlist');
                            }
                            // console.log('executed');
                        });
                        req.flash('success', res.__('DELETE_USER_SUCCESS'));
                        res.redirect('/admin/userlist');
                    });

                });
            }
        });
    });

    app.post('/admin/edituser', csrf, checkLogin, function(req, res) {
        var username = req.body.username,
            email = req.body.email,
            role = req.body.role,
            password = req.body.password,
            repeatPassword = req.body['password-repeat'],
            inputError = '';

        try {
            check(email, 'EMAIL_INVALID').len(4, 64).isEmail();
            check(password, 'PASSWORD_EMPTY').notEmpty();
        } catch (e) {
            inputError = e.message;
        }

        if (password === repeatPassword) {
            var hash = crypto.createHash('sha256'),
                password = hash.update(req.body.password).digest('hex');
            var hash = crypto.createHash('sha256'),
                repeatPassword = hash.update(repeatPassword).digest('hex');

        } else {
            inputError = 'PASSWORD_NOT_EQUAL';
        }

        if (inputError) {
            req.flash('error', res.__(inputError));
            return res.redirect('/admin/userlist');
        }

        var newUser = new User({
            name: username,
            email: email,
            password: password,
            active: true,
            role: role
        });

        Admin.useredit(newUser, function(err, user){
            if(err) {
                req.flash('error', res.__(err));
                return res.redirect('/admin/userlist');
            }
            req.flash('success', res.__('USER_UPDATED'));
            res.redirect('/admin/userlist');
        });
    });

    app.get('/admin/domainlist', csrf, checkLogin, function(req, res) {
        var page = req.query.p?parseInt(req.query.p):1,
            limit = req.query.limit?parseInt(req.query.limit):50;
        // Check user has permission to access admin dashbord.
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                Admin.domainlist(page, limit, function(err, domains) {
                    if(err) {
                        domains = [];
                        req.flash('error', err);
                    }
                    res.render('domainlist', {
                        siteName: config.siteName,
                        siteTagline: config.siteTagline,
                        title: res.__('DOMAINS_LIST') + ' - ' + config.siteName,
                        allowReg: config.allowReg,
                        user: req.session.user,
                        domains: domains,
                        paginationData: domains,
                        paginationLimit: limit,
                        page: page,
                        success: req.flash('success').toString(),
                        error: req.flash('error').toString()
                    });
                });
            }
        });
    });

    app.post('/admin/adddomain', csrf, checkLogin, function(req, res) {
        console.log(req.body.belongs);
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                var newDomain = new Domain({
                    name: req.body.domain,
                    belongs: req.body.belongs
                });
                if (tld.getDomain(newDomain.name) == newDomain.name && tld.tldExists(newDomain.name)) {
                    // Domain valid, check if domain exists in db.
                    Domain.check(newDomain.name, function(err, data) {
                        if (data) {
                            // console.log(data);
                            // Domain exists, return error.
                            req.flash('error', res.__('DOMAIN_EXISTS'));
                            return res.redirect('/admin/domainlist');
                        } else {
                            // Check for owner.
                            User.check(req.body.belongs, null, function(err, user) {
                                if (!user) {
                                    req.flash('error', res.__('USER_NOT_EXIST'));
                                    return res.redirect('/admin/domainlist');
                                }
                                // Domain not exist, insert into database.
                                newDomain.save(function(err) {
                                    if (err) {
                                        res.redirect('/admin/domainlist');
                                        return req.flash('error',err);
                                    }
                                    req.flash('success',res.__('ADD_DOMAIN_SUCCESS'));
                                    res.redirect('/admin/domainlist');
                                });
                            });
                        }
                    });
                } else {
                    req.flash('error', res.__('DOMAIN_NOT_VALID'));
                    return res.redirect('/domainlist');
                }
            }
        });
    });

    app.post('/admin/editdomain', csrf, checkLogin, function(req, res) {
        // console.log(req.body.domainId);
        // console.log(req.body.belongs);
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                User.check(req.body.belongs, null, function(err, user) {
                    if (!user) {
                        req.flash('error', res.__('USER_NOT_EXIST'));
                        return res.redirect('/admin/domainlist');
                    }
                    // Domain not exist, insert into database.
                    Admin.editdomain(parseInt(req.body.domainId), req.body.belongs, function(err) {
                        if (err) {
                            req.flash('error', err);
                            return res.redirect('/admin/domainlist');
                        } else {
                            req.flash('success', res.__('DOMAIN_UPDATED'));
                            res.redirect('/admin/domainlist');
                        }
                    });
                });
            }
        });
    });

    app.post('/admin/deletedomain', csrf, checkLogin, function(req, res) {
        // console.log(req.body.domainId);
        // console.log(req.body.belongs);
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/admin/domainlist');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                Domain.remove(parseInt(req.body.domainId), req.body.belongs, function(err) {
                    if (err) {
                        req.flash('error', err);
                        return res.redirect('/admin/domainlist');
                    }
                    req.flash('success', res.__('DOMAIN_DELETED'));
                    res.redirect('/admin/domainlist');
                });
            }
        });
    });

    app.get('/admin/send-broadcast', csrf, checkLogin, function(req, res) {
        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/admin/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                res.render('send-broadcast', {
                    siteName: config.siteName,
                    siteTagline: config.siteTagline,
                    title: res.__('SEND_BROADCAST') + ' - ' + config.siteName,
                    allowReg: config.allowReg,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            }
        });
    });

    app.post('/admin/send-broadcast', csrf, checkLogin, function(req, res) {

        if (!req.body.subject || !req.body.message) {
            req.flash('error', res.__('MISSING_FIELD'));
            return res.redirect('/contact');
        }

        User.check(req.session.user.name, req.session.user.email, function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/admin/');
            }
            if(user.role != 'admin') {
                req.flash('error', res.__('NO_PERMISSION'));
                return res.redirect('/');
            } else {
                Admin.emaillist(function(err, emails) {
                    if (err) {
                        req.flash('error', err);
                        return res.redirect('/admin/send-broadcast');
                    }

                    // Join emails array to string
                    // console.log(emails);
                    var receivers = '';
                    emails.forEach(function(email) {
                        // console.log(email.email);
                        receivers = receivers.concat(email.email + ", ");
                    });
                    // console.log(receivers);

                    var mailOptions = {
                        from: config.serviceMailSender, // sender address
                        bcc: receivers, // list of receivers
                        subject: req.body.subject + ' - ' + config.siteName, // Subject line
                        html: req.body.message // html body
                    }

                    // console.log('executed');
                    // send mail with defined transport object
                    smtpTransport.sendMail(mailOptions, function(err, response) {
                        // console.log('executed');
                        if (err) {
                            console.log(err);
                            req.flash('error', err);
                            return res.redirect('/admin/send-broadcast');
                        } else {
                            req.flash('success', res.__('MSG_SENT'))
                            res.redirect('/admin');
                        }

                        // if you don't want to use this transport object anymore, uncomment following line
                        smtpTransport.close(); // shut down the connection pool, no more messages
                    });
                });
            }
        });
    });


    // A default 404 page.
    /*
    app.all('*', function(req, res){
        req.flash('error', res.__('404'));
        res.status(404);
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
    */

    // Session functions
    function checkLogin(req, res, next) {
        if(!req.session.user) {
            req.flash('error', res.__('LOGIN_NEEDED'));
            return res.redirect('/login');
        }
        next();
    }

    function checkNotLogin(req, res, next) {
        if(req.session.user) {
            req.flash('error', res.__('ALREADY_LOGIN'));
            return res.redirect('/');
        }
        next();
    }

    // CSRF Protect
    function csrf(req, res, next) {
        res.locals.token = req.session._csrf;
        next();
    }

};