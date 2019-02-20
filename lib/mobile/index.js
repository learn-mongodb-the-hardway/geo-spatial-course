const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Crawl } = require('../models/crawl');

module.exports = (options) => {
  var router = express.Router();
  router.use(cors());
  router.options('*', cors());

  router.use(require('cookie-parser')());
  router.use(require('body-parser').urlencoded({ extended: true }));
  router.use(require('body-parser').json());
  router.use(require('express-session')({ secret: options.secret, resave: false, saveUninitialized: false }));

  // Get the user collection
  const users = options.db.collection('users');
  const crawls = options.db.collection('crawls');
  const pubs = options.db.collection('pubs');
  const postcodes = options.db.collection('postcodes');

  // Wrapper object
  const crawl = new Crawl(crawls);

  router.get('/', (req, res) => {
    console.log("============== /mobile")
    res.render('mobile/index.ejs', {
      options: options
    });
  });

  router.post('/', async (req, res) => {
    console.log("============== /mobile")
    console.dir(req.body)

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
    res.send(JSON.stringify(docs));
  });

  router.post('/location', async (req, res) => {
    console.log("============== /location")

    // console.dir(req)
    res.send(req.body);
  })

  return router
};