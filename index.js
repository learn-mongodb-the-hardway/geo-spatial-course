'use strict';
 
const { readFileSync, existsSync } = require('fs');

// Default config
var config = {
  accessToken: existsSync('./token.txt') ? readFileSync('./token.txt', 'utf8') : '',
  mongoURI: 'mongodb://localhost:27017',
  databaseName: 'geo-spatial',
  email: 'john.doe@example.com',
  configDir: '~/.config/pubcrawl/',
  secret: 'session password..',
  port: 8080
};

// Do we have a config file, read it
if (existsSync('./config.json')) {
  config = Object.assign(config, JSON.parse(readFileSync('./config.json', 'utf8')));
}

require('./app.js').listen(config.port);