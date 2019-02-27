const express = require('express');
const passport = require('passport');
const cors = require('cors');
const { Strategy } = require('passport-local');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

// Routes 
const { indexGet, indexPost } = require('./routes/index');
const { locationPost } = require('./routes/location');
const { leaveGet } = require('./routes/leave');
const { joinGet, joinPost } = require('./routes/join');
const { loginPost } = require('./routes/login');
const { ensureLoggedIn } = require('../shared');

// Export the router
module.exports = (options) => {
  // Configure the router
  var router = express.Router();

  // Add all the routes
  router.get('/', indexGet);
  router.post('/', indexPost);
  router.post('/location', 
    ensureLoggedIn('admin', '/mobile'), locationPost);
  router.get('/leave', leaveGet);
  router.get('/join/:crawlId', joinGet);
  router.post('/join/:crawlId', joinPost);
  router.post('/login/:crawlId', passport.authenticate('local', { failureRedirect: '/admin/login' }), loginPost);

  // Get the user collection
  const users = options.db.collection('users');
  // Return the router
  return router;
}