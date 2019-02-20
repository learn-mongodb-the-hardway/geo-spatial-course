const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { Crawl } = require('../models/crawl');

module.exports = (options) => {
  var router = express.Router();
  // Get the user collection
  const attendants = options.db.collection('attendants');
  const users = options.db.collection('users');
  const crawls = options.db.collection('crawls');
  const pubs = options.db.collection('pubs');
  const postcodes = options.db.collection('postcodes');

  // Wrapper object
  const crawl = new Crawl(crawls);

  router.get('/', (req, res) => {
    res.render('mobile/index.ejs', {
      options: options
    });
  });

  router.post('/', async (req, res) => {
    // Unpack the geo parameters
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const timestamp = req.body.timestamp;

    // Get any crawls that are in the area
    const docs = await crawls.find({
      'location.polygon': {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [latitude, longitude]
          }
        }
      },
      from: {
        $lte: new Date(timestamp)
      },
      to: {
        $gte: new Date(timestamp)
      }
    }).toArray();

    // Send all the open crawls
    res.render('mobile/pub_crawls.ejs', {
      crawls: docs
    });
  });

  router.get('/join/:crawlId', async (req, res) => {
    // Grab the crawl doc
    var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

    // Send all the open crawls
    res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(req.baseUrl), errors: {}
    });
  });

  router.post('/join/:crawlId', async (req, res) => {
    // Grab the crawl doc
    var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
    var errors = {};

    // Get the fields
    const name = req.body.name;
    const username = req.body.username;
    const password = req.body.password;

    // Validate the input
    if (name == null || name.length == 0) {
      errors['name'] = `Name cannot be empty`;
    }

    if (username == null || username.length == 0) {
      errors['username'] = `Username cannot be empty`;
    }

    if (password == null || password.length == 0) {
      errors['password'] = `Password cannot be empty`;
    }

    // If check if the user exists
    const attendant = await attendants.findOne({
      username: username
    });

    // If the user exists already
    if (attendant != null) {
      errors['username'] = `Username already exists`;
    }

    // If no errors let's crate the user
    if (Object.keys(errors).length > 0) {
      return res.render('mobile/join.ejs', {
        doc: doc, url: generateUrl(req.baseUrl), errors: errors
      });     
    }

    // Hash the password
    const hash = crypto.createHash('sha256');
    hash.write(password);

    // Create a user
    await attendant.insertOne({
      name: name,
      username: username,
      password: hash.digest('hex'),
      createdOn: new Date()
    });

    // 
  });

  router.post('/location', async (req, res) => {
    console.log("============== /location")

    // console.dir(req)
    res.send(req.body);
  })

  return router
};

function generateUrl(baseUrl) {
  return (url) => {
    return `${baseUrl}/${url}`;
  }
}