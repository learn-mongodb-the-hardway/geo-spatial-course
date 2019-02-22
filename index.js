const express = require('express');
const { readFileSync } = require('fs');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

// Startup variables
const accessToken = readFileSync('./token.txt', 'utf8'); // Access token for map-box
const mongoURI = 'mongodb://localhost:27017';
const databaseName = 'geo-spatial';
const secret = 'session password..';

// Create session store
const store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
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

// Connect to the database
client.connect(async (err, client) => {
  if (err) throw err;

  // Ensure geo indexes
  try {
    await client.db(databaseName).collection('pubs').createIndex({ geometry: "2dsphere" });
  } catch (err) {}
  try {
    await client.db(databaseName).collection('postcodes').createIndex({ geometry: "2dsphere" });
  } catch (err) {}
  try {
    await client.db(databaseName).collection('crawls').createIndex({ "location.geometry": "2dsphere" });
  } catch (err) {}
  try {
    await client.db(databaseName).collection('crawls').createIndex({ "location.polygon": "2dsphere" });
  } catch (err) {}

  // Global options
  const globalOptions = {
    accessToken: accessToken,
    db: client.db(databaseName),
    secret: secret
  }

  // Add the additional fields to the request
  app.use((req, res, next) => {
    req.db = client.db(databaseName);
    req.options = {
      accessToken: accessToken, secret: secret
    }

    next();
  });

  //
  // Add module Routers
  app.use('/mobile', mobile(globalOptions));
  app.use('/admin', admin(globalOptions));

  //
  // Routes
  app.get("/", (req, res) => {
    res.render('index.ejs', { accessToken: accessToken });
  });

  app.listen(8080);
});