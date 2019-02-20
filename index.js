const express = require('express');
const { readFileSync } = require('fs');
const { MongoClient } = require('mongodb');
const cors = require('cors');

// Startup variables
const accessToken = readFileSync('./token.txt', 'utf8'); // Access token for map-box
const mongoURI = 'mongodb://localhost:27017';
const databaseName = 'geo-spatial';
const secret = 'session password..';

// Express application and setups
const app = express();
app.use(cors());
app.options('*', cors());
app.set('view engine', 'ejs')
app.use('/static', express.static('public'))

// Database instance
const client = MongoClient(mongoURI, { useNewUrlParser: true });

// Application modules
const mobile = require('./lib/mobile/index');
const admin = require('./lib/admin/index');

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

  // Global options
  const globalOptions = {
    accessToken: accessToken,
    db: client.db(databaseName),
    secret: secret
  }

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