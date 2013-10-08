
/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes')
    , http = require('http')
    , path = require('path')
    , MongoStore = require('connect-mongo')(express)
    , config = require('./config.js')
    , flash = require('connect-flash')
    , i18n = require('i18n');

i18n.configure({
    locales:['zh-cn', 'zh-moe'],
    defaultLocale: config.language,
    directory: './i18n',
    updateFiles: false,
    indent: "\t",
    extension: '.json'
});

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(config.cookieSecret));
app.use(express.session({
    secret: config.cookieSecret,
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
    store: new MongoStore({
        db: config.mongodb,
        clear_interval: 3600
    })
}));
app.use(i18n.init);
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/public' }));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

routes(app);

http.createServer(app).listen(app.get('port'), '127.0.0.1', function(){
  console.log('Express server listening on port ' + app.get('port'));
});
