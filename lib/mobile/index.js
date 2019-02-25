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

// Add all the routes
router.get('/', indexGet);
router.post('/', indexPost);
router.post('/location', locationPost);
router.get('/leave', leaveGet);
router.get('/join/:crawlId', joinGet);
router.post('/join/:crawlId', joinPost);

module.exports = (options) => {
  // Get the user collection
  const attendants = options.db.collection('attendants');
  const users = options.db.collection('users');
  const crawls = options.db.collection('crawls');
  const pubs = options.db.collection('pubs');
  const postcodes = options.db.collection('postcodes');

  // Wrapper object
  const crawl = new Crawl(crawls);

  router.post('/login/:crawlId', async (req, res) => {
    // Grab the crawl doc
    var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
    var errors = {};

    // Unpack the variables
    const username = req.body.username || '';
    const password = req.body.password || '';
   
    // Hash the password
    const hash = crypto.createHash('sha256');
    hash.write(password);
    const hashedPassword = hash.digest('hex');

    // Check if the user exists
    const attendant = await attendants.findOne({
      username: username,
      password: hashedPassword
    });

    // No user
    if (attendant == null) {
      errors['error'] = `User does not exist or password is wrong`;
    }

    // If we have errors render the form with the errors
    if (Object.keys(errors).length > 0) {
      return res.render('mobile/join.ejs', {
        doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
      });     
    }

    // We are going to add the user to the crawl as an
    // attendant 
    const result = await crawls.updateOne({
      _id: doc._id
    }, {
      $addToSet: {
        attendants: attendant._id
      }
    });

    // If we have errors render the form with the errors
    if (Object.keys(errors).length > 0) {
      return res.render('mobile/join.ejs', {
        doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
      });     
    }

    // Set the session crawl id
    req.session.loggedIn = true;
    req.session.crawlId = doc._id;
    req.session.userId = attendant._id;

    // Render the view of the pub crawl
    res.redirect(req.baseUrl);
  })

  return router
};

function generateUrl(baseUrl) {
  return (url) => {
    return `${baseUrl}/${url}`;
  }
}