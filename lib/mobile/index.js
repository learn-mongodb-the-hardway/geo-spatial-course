const express = require('express');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { Crawl } = require('../models/crawl');
const router = express.Router();

// Routes 
const { indexGet, indexPost } = require('./routes/index');

// Add all the routes
router.get('/', indexGet);
router.post('/', indexPost);

module.exports = (options) => {
  // Get the user collection
  const attendants = options.db.collection('attendants');
  const users = options.db.collection('users');
  const crawls = options.db.collection('crawls');
  const pubs = options.db.collection('pubs');
  const postcodes = options.db.collection('postcodes');

  // Wrapper object
  const crawl = new Crawl(crawls);

  router.post('/location', async (req, res) => {
    // Check if have an active session
    if (req.session.loggedIn == null) {
      return res.send({}); 
    }

    // Create location point
    const location = {
      type: 'Point', coordinates: [req.body.longitude, req.body.latitude]  
    }

    // Update the attendants location
    await attendants.updateOne({
      _id: req.session.userId
    }, {
      $set: {
        location: location
      } 
    });

    // Grab the crawl
    var doc = await crawl.findById(req.session.crawlId);
    var pubIds = doc && doc.pubs ? doc.pubs : [];

    // Check if we are inside a pub and mark the crawl with people in the pub
    var docs = await pubs.find({
      _id: { $in: pubIds },
      geometry: {
        $nearSphere: {
          $geometry: location,
          $maxDistance: 15
        }
      } 
    }).toArray();

    // Clear out any attendance
    var pullMap = {};
    // Create pub list
    pubIds.forEach((pubId) => {
      pullMap[`attendants_location.${pubId}`] = req.session.userId;
    });

    // Add the user to the crawls pub current attendance list
    await crawls.updateMany({
      _id: req.session.crawlId
    }, {
      $pull: pullMap
    })

    // Attendant is in a pub
    if (docs.length) {
      var setMap = {};
      // Create pub list
      docs.forEach((doc) => {
        setMap[`attendants_location.${doc._id}`] = req.session.userId;
      });

      // Add the user to the crawls pub current attendance list
      await crawls.updateMany({
        _id: req.session.crawlId
      }, {
        $addToSet: setMap
      })
    }

    res.send({});
  });

  router.get('/leave', async (req, res) => {
    // Remove the user from any crawl pub attendence
    const doc = await crawl.findById(req.session.crawlId);

    // No pub crawl
    if (doc == null) {
      // Set the session crawl Id to undefined
      req.session.crawlId = undefined;
      // Redirect to the main page for mobile
      return res.redirect(req.baseUrl);
    }

    // Build the update to remove the person from any pub in attendance
    const pubIds = doc.pubs || [];
    
    // Build update clause
    const updateClause = { $pull: [] };

    // Pull attendance from any pubs we are checked into
    if (pubIds.length) {
      const removeAttendantMap = {};

      pubIds.forEach(pubId => {
        removeAttendantMap[`attendants_location.${pubId}`] = req.session.userId;
      });  

      updateClause['$pull'] = removeAttendantMap;
    }

    // Pull the user from the attendance array
    updateClause['$pull'].attendants = req.session.userId;

    // Finish up the crawl
    await crawls.updateOne({
      _id: req.session.crawlId
    }, updateClause);    

    // Set the session crawl Id to undefined
    req.session.crawlId = undefined;

    // Redirect to the main page for mobile
    res.redirect(req.baseUrl);
  });

  router.get('/join/:crawlId', async (req, res) => {
    // Grab the crawl doc
    var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

    // Are we logged in
    if (req.session.loggedIn && req.session.userId) {
      // Add the user to the crawl
      // We are going to add the user to the crawl as an
      // attendant 
      const result = await crawls.updateOne({
        _id: doc._id
      }, {
        $addToSet: {
          attendants: req.session.userId
        }
      });
      
      // Set the crawlId on the session object
      req.session.crawlId = doc._id;

      // Render the view of the crawl
      return res.redirect(req.baseUrl);
    }

    // Send all the open crawls
    res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(req.baseUrl), errors: {}, values: {}
    });
  });

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