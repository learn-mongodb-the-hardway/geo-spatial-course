const express = require('express');
const { readFileSync } = require('fs');
const { MongoClient } = require('mongodb');

// Startup variables
const accessToken = readFileSync('./token.txt', 'utf8'); // Access token for map-box
const mongoURI = 'mongodb://localhost:27017';
const databaseName = 'geo-spatial';

// Express application and setups
const app = express();
app.set('view engine', 'ejs')
app.use('/static', express.static('public'))

// Database instance
const client = MongoClient(mongoURI, { useNewUrlParser: true });

// Application modules
const mobile = require('./lib/mobile/index');

// Connect to the database
client.connect((err, client) => {
  if (err) throw err;

  // Global options
  const globalOptions = {
    accessToken: accessToken,
    db: client.db(databaseName)
  }

  //
  // Add module Routers
  app.use('/mobile', mobile(globalOptions));

  //
  // Routes
  app.get("/", (req, res) => {
    res.render('index.ejs', { acessToken: acessToken });
  });

  app.listen(8080);
});