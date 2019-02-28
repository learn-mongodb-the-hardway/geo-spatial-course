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

require('greenlock-express').create({
  email: config.email     // The email address of the ACME user / hosting provider
, agreeTos: true                    // You must accept the ToS as the host which handles the certs
, configDir: config.configDir      // Writable directory where certs will be saved
, communityMember: true             // Join the community to get notified of important updates
, telemetry: true                   // Contribute telemetry data to the project
  // Using your express app:
  // simply export it as-is, then include it here
, app: require('./app.js')
 
//, debug: true
}).listen(80, 443);