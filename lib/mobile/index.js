const express = require('express');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { Crawl } = require('../models/crawl');
const router = express.Router();

// Routes 
const { indexGet, indexPost } = require('./routes/index');
const { locationPost } = require('./routes/location');
const { leaveGet } = require('./routes/leave');
const { joinGet, joinPost } = require('./routes/join');
const { loginPost } = require('./routes/login');

// Add all the routes
router.get('/', indexGet);
router.post('/', indexPost);
router.post('/location', locationPost);
router.get('/leave', leaveGet);
router.get('/join/:crawlId', joinGet);
router.post('/join/:crawlId', joinPost);
router.post('/login/:crawlId', loginPost);

// Export the router
module.exports = router;