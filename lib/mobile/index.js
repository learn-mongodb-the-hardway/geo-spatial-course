const express = require('express');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { Crawl } = require('../models/crawl');
const router = express.Router();

// Routes 
const { indexGet, indexPost } = require('./routes/index');
const { locationPost } = require('./routes/location');
const { leaveGet } = require('./routes/leave');
const { }

// Add all the routes
router.get('/', indexGet);
router.post('/', indexPost);
router.post('/location', locationPost);
router.get('/leave', leaveGet);

module.exports = (options) => {
  // Get the user collection
  const attendants = options.db.collection('attendants');
  const users = options.db.collection('users');
  const crawls = options.db.collection('crawls');
  const pubs = options.db.collection('pubs');
  const postcodes = options.db.collection('postcodes');

  // Wrapper object
  const crawl = new Crawl(crawls);

  // router.get('/join/:crawlId', async (req, res) => {
  //   // Grab the crawl doc
  //   var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

  //   // Are we logged in
  //   if (req.session.loggedIn && req.session.userId) {
  //     // Add the user to the crawl
  //     // We are going to add the user to the crawl as an
  //     // attendant 
  //     const result = await crawls.updateOne({
  //       _id: doc._id
  //     }, {
  //       $addToSet: {
  //         attendants: req.session.userId
  //       }
  //     });
      
  //     // Set the crawlId on the session object
  //     req.session.crawlId = doc._id;

  //     // Render the view of the crawl
  //     return res.redirect(req.baseUrl);
  //   }

  //   // Send all the open crawls
  //   res.render('mobile/join.ejs', {
  //     doc: doc, url: generateUrl(req.baseUrl), errors: {}, values: {}
  //   });
  // });

  router.post('/join/:crawlId', async (req, res) => {
    // Grab the crawl doc
    var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
    var errors = {};

    // Get the fields
    const name = req.body.name || '';
    const username = req.body.username || '';
    const password = req.body.password || '';

    // Validate the input
    if (name.length == 0) {
      errors['name'] = `Name cannot be empty`;
    }

    if (username.length == 0) {
      errors['username'] = `Username cannot be empty`;
    }

    if (password.length == 0) {
      errors['password'] = `Password cannot be empty`;
    }

    // If check if the user exists
    const attendant = await attendants.findOne({
      username: username
    });

    // If the user exists already
    if (attendant != null) {
      errors['error'] = `Username already exists`;
    }

    // If no errors let's crate the user
    if (Object.keys(errors).length > 0) {
      return res.render('mobile/join.ejs', {
        doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
      });     
    }

    // Hash the password
    const hash = crypto.createHash('sha256');
    hash.write(password);

    // Create user id
    const id = ObjectId();

    // Create a user
    await attendants.insertOne({
      _id: id,
      name: name,
      username: username,
      password: hash.digest('hex'),
      createdOn: new Date()
    });

    // Add the user to the crawl
    // We are going to add the user to the crawl as an
    // attendant 
    const result = await crawls.updateOne({
      _id: doc._id
    }, {
      $addToSet: {
        attendants: id
      }
    });

    if (result.modifiedCount == 0) {
      errors['error'] = `Pub crawl does not exist`;
    }

    // If we have errors render the form with the errors
    if (Object.keys(errors).length > 0) {
      return res.render('mobile/join.ejs', {
        doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
      });     
    }

    // Set the session crawl id
    req.session.loggedIn = true;
    req.session.crawlId = doc._id;
    req.session.userId = id;

    // Render the view of the pub crawl
    res.redirect(req.baseUrl);
  });

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