const express = require('express');
const passport = require('passport');

// Routes 
const { indexGet, indexPost } = require('./routes/index');
const { locationPost } = require('./routes/location');
const { leaveGet } = require('./routes/leave');
const { joinGet, joinPost } = require('./routes/join');
const { loginPost } = require('./routes/login');
const { attendantsGet, attendantsLocationsGetJSON } = require('./routes/attendants');
const { ensureLoggedIn } = require('../shared');

// Create a router
const router = express.Router();

// Add all the routes
router.get('/', indexGet);
router.post('/', indexPost);
router.post('/location', 
  ensureLoggedIn('admin', '/mobile'), locationPost);
router.get('/leave', leaveGet);
router.get('/join/:crawlId', joinGet);
router.post('/join/:crawlId', joinPost);
router.post('/login/:crawlId', 
  passport.authenticate('local', { failureRedirect: '/mobile', failureFlash : 'User or password is incorrect' }), loginPost);
router.get('/attendants/:crawlId', 
  ensureLoggedIn('/mobile'), attendantsGet);
router.get('/locations/:crawlId',
  ensureLoggedIn('/mobile'), attendantsLocationsGetJSON);


module.exports = router;