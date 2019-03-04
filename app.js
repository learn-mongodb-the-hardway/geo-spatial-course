const express = require('express');
const { readFileSync, existsSync } = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const { Strategy } = require('passport-local');
const crypto = require('crypto');
const { hashPassword } = require('./lib/shared');

// Grab all models
const { User } = require('./lib/models/user');
const { Crawl } = require('./lib/models/crawl');
const { Pub } = require('./lib/models/pub');
const { PostCode } = require('./lib/models/postcode');

// Default config
var config = {
  accessToken: existsSync('./token.txt') ? readFileSync('./token.txt', 'utf8') : '',
  mongoURI: 'mongodb://localhost:27017',
  databaseName: 'geo-spatial',
  secret: 'session password..',
  port: 8080
};

// Do we have a config file, read it
if (existsSync('./config.json')) {
  config = Object.assign(config,  JSON.parse(readFileSync('./config.json', 'utf8')));
}

// Startup variables
const accessToken = config.accessToken;
const mongoURI = config.mongoURI;
const databaseName = config.databaseName;
const secret = config.secret;
const port = config.port

// Create session store
const store = new MongoDBStore({
  uri: mongoURI,
  databaseName: databaseName,
  collection: 'sessions'
});

// Express application and setups
const app = express();
app.use(cors());
app.options('*', cors());
app.set('view engine', 'ejs')
app.use('/static', express.static('public'))

// Set up basics
app.use(require('connect-flash')());
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('body-parser').json());
app.use(require('express-session')({ 
  secret: secret, 
  resave: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  saveUninitialized: true 
}));

// Database instance
const client = MongoClient(mongoURI, { useNewUrlParser: true });

// Application modules
const mobile = require('./lib/mobile/index');
const admin = require('./lib/admin/index');

// Catch store errors
store.on('error', error => {
  console.err(error);
});

async function executeAndSkipException(func) {
  try {
    await func();
  } catch (err) {}
}

// Connect to the database
client.connect(async (err, client) => {
  if (err) throw err;

  // Ensure geo indexes
  executeAndSkipException(client.db(databaseName).collection('pubs').createIndex({ geometry: "2dsphere" }));
  executeAndSkipException(client.db(databaseName).collection('postcodes').createIndex({ geometry: "2dsphere" }));
  executeAndSkipException(client.db(databaseName).collection('crawls').createIndex({ "location.geometry": "2dsphere" }));
  executeAndSkipException(client.db(databaseName).collection('crawls').createIndex({ "location.polygon": "2dsphere" }));

  // Global options
  const globalOptions = {
    accessToken: accessToken,
    db: client.db(databaseName),
    secret: secret
  }

  // Get the user collection
  const users = client.db(databaseName).collection('users');

  // Configure the local strategy for use by Passport.
  //
  // The local strategy require a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy(
    (username, password, cb) => {
      users.findOne({
        username: username
      }, (err, user) => {
        if (err) { return cb(err); }
        if (!user) { return cb(null, false); }

        // Hash the password
        const hashedPassword = hashPassword(password);

        // Check if the hashed password is the same
        if (user.password != hashedPassword) { return cb(null, false); }
        return cb(null, user);
      });
    }));

  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  The
  // typical implementation of this is as simple as supplying the user ID when
  // serializing, and querying the user record by ID from the database when
  // deserializing.
  passport.serializeUser((user, cb) => {
    cb(null, user._id);
  });

  passport.deserializeUser((id, cb) => {
    users.findOne({
      _id: ObjectId(id)
    }, (err, user) => {
      if (err) { return cb(err); }
      cb(null, user);
    });
  });

  // Initialize Passport and restore authentication state, if any, from the
  // session.
  app.use(passport.initialize());
  app.use(passport.session());

  // Add the additional fields to the request
  app.use((req, res, next) => {

    // Add the database
    req.db = client.db(databaseName);
    // Add the options
    req.options = {
      accessToken: accessToken, secret: secret
    }

    // Add the models
    req.models = {
      user: new User(req.db.collection('users')),
      crawl: new Crawl(req.db.collection('crawls')),
      pub: new Pub(req.db.collection('pubs')),
      postcode: new PostCode(req.db.collection('postcodes'))
    }

    // Call next middleware
    next();
  });

  //
  // Add module Routers
  app.use('/mobile', mobile);
  app.use('/admin', admin);

  //
  // Routes
  app.get("/", (req, res) => {
    // Redirect to mobile view
    if (isMobilePhone(req)) {
      return res.redirect('/mobile');
    }

    // Render the main page
    res.render('index.ejs', { accessToken: accessToken });
  });
});

function isMobilePhone(req) {
  return /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile|ipad|android|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i
    .test(req.header('user-agent'));
}

module.exports = app;