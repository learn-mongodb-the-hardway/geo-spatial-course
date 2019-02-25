const express = require('express');
const passport = require('passport');
const cors = require('cors');
const circleToPolygon = require('circle-to-polygon');
const { Strategy } = require('passport-local');
const crypto = require('crypto');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const { MapBoxServices } = require('../mapbox');
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

  // Configure the local strategy for use by Passport.
  //
  // The local strategy require a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy(
    (username, password, cb) => {
      users.findOne({
        username: username, role: 'admin'
      }, (err, user) => {
        if (err) { return cb(err); }
        if (!user) { return cb(null, false); }

        // Hash the password
        const hash = crypto.createHash('sha256');
        hash.write(password);
        const hashedPassword = hash.digest('hex');

        // Check if the hashed password is the same
        if (user.password != hashedPassword) { return cb(null, false); }
        return cb(null, user);
      });
    }));


  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  The
  // typical implementation of this is as simple as supplying the user ID when
  // serializing, and querying the user record by ID from the database when
  // deserializing.
  passport.serializeUser((user, cb) => {
    cb(null, user._id);
  });

  passport.deserializeUser((id, cb) => {
    users.findOne({
      _id: ObjectId(id)
    }, (err, user) => {
      if (err) { return cb(err); }
      cb(null, user);
    });
  });

  // Initialize Passport and restore authentication state, if any, from the
  // session.
  router.use(passport.initialize());
  router.use(passport.session());
  
  // // Set dummy user
  // router.use((req, res, next) => {
  //   req.user = {username: 'admin'}
  //   next();
  // });

  /**
   * Routes
   */
  router.get('/', (req, res) => {
    res.render('admin/index', { user: req.user, url: generateUrl(req.baseUrl) });
  });

  router.get('/login', (req, res) => {
    res.render('admin/login', { url: generateUrl(req.baseUrl) });
  });
    
  router.post('/login', 
    passport.authenticate('local', { failureRedirect: '/admin/login' }),
    (req, res) => {
      res.redirect(`${req.baseUrl}/crawls`);
    });
    
  router.get('/logout', (req, res) => {
    req.logout();
    res.redirect(`/`);
  });
   
  router.get('/create', (req, res) => {
    res.render('admin/create', { 
      url: generateUrl(req.baseUrl), errors: {}, values: {}
    });
  });

  router.post('/create', async (req, res) => {
    // Check if the user exists
    var errors = {};
    if (req.body.username == null || req.body.username == '') {
      errors['username'] = 'username cannot be null or empty';
    }

    if (req.body.password == null || req.body.password == '') {
      errors['password'] = 'password cannot be null or empty';
    }

    if (req.body.password != req.body.confirm_password) {
      errors['confirm_password'] = 'password and confirm password must be equal';
    }

    // Check if the user exists
    var user = await users.find({ username: req.body.username });
    if (user == null) {
      errors['user'] = `user ${req.body.username} already exists`;
    }

    // We have an error render with errors
    if (Object.keys(errors).length > 0) {
      return res.render('admin/create', { 
        url: generateUrl(req.baseUrl), errors: errors, values: req.body, options: options
      });
    }

    // Hash the password
    const hash = crypto.createHash('sha256');
    hash.write(req.body.password);

    // Create a user
    await users.insertOne({
      username: req.body.username,
      password: hash.digest('hex'),
      createdOn: new Date()
    });

    // Take the user to the login prompt
    res.redirect(`${req.baseUrl}/login`);
  });

  /**
   * End points to create new Pub Crawls
   */
  router.post('/crawls/pub/add/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Add the pub to the list
      var result = crawls.updateOne({
        _id: new ObjectId(req.params.crawlId)
      }, {
        $push: { pubs: new ObjectId(req.body._id) }
      });

      // Get the crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

      // Render the pub list
      res.render('partials/admin/crawls/pub_list', {
         user: req.user, url: generateUrl(req.baseUrl), crawl: doc, address: address 
      });
  });

  router.get('/crawls/location/set/:crawlId/:addressId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Fetch the crawl
      var doc = await crawl.findById(new ObjectId(req.params.crawlId));
      // Locate the result in the search locations
      const locations = doc['searchLocations'] ? doc.searchLocations.filter(location => {
        return location.id == req.params.addressId;
      }) : [];

      // We have a location set the current location on the document
      if (locations.length) {
        // Get the location
        var location = locations[0];
        // Convert the geometry center to a circle
        let polygon = circleToPolygon(location.center, doc.locationDistance || 1000, 32)

        // Add polygon to the document
        location.polygon = polygon;

        // Update the crawl with the location
        var results = await crawls.updateOne({
          _id: new ObjectId(req.params.crawlId)
        }, {
          $set: {
            location: location
          },
          $unset: {
            searchLocations: true
          }
        });
      }

      // Get the crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: doc,
        locations: locations,
        distance: req.body.distance || 1000,
        address: address,
        moment: moment,
        pubs: [] 
      });
    });

  router.post('/crawls/location/find/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Create a mapbox service
      const service = new MapBoxServices(options.accessToken);
      // Geocode the address
      const locations = await service.geoCode(req.body.address);

      // Store the results on the crawl to avoid unnecessary geo encoding
      var r = await crawls.updateOne({
        _id: new ObjectId(req.params.crawlId)
      }, {
        $set: {
          searchLocations: locations,
          locationDistance: req.body.distance || 1000
        }
      });

      // Get the crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: doc,
        locations: locations,
        distance: req.body.distance || 1000,
        address: address,
        moment: moment,
        pubs: [] 
      });      
    });

  router.get('/crawls/pub/delete/:crawlId/:pubId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Update the doc
      var result = await crawl.removePub(new ObjectId(req.params.crawlId), new ObjectId(req.params.pubId));

      // Get the crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: doc,
        address: address,
        moment: moment,
        pubs: [] 
      });
  });

  router.get('/crawls/pub/moveup/:crawlId/:pubId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Update the doc
      var result = await crawl.movePubUp(new ObjectId(req.params.crawlId), new ObjectId(req.params.pubId));

      // Get the crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: doc,
        address: address,
        moment: moment,
        pubs: [] 
      });
  });

  router.post('/crawls/pub/find/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Fetch the associated pub crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

      var pubDocs = [];

      // If we have an address locate the center of the point
      if (req.body.address) {
        var distance = req.body.distance || 1000;
        // Create a mapbox service
        const service = new MapBoxServices(options.accessToken);
        // Geocode the address
        const locations = await service.geoCode(req.body.address);
        // Get the first location if any
        if (locations.length) {
          // Get the center point (lets us ignore that the returned feature is a polygon)
          var center = locations[0].center;
          // Locate all the entries near the center point
          pubDocs = await pubs.find({
            geometry: {
              $nearSphere: {
                $geometry: {
                  type: "Point",
                  coordinates: center
                },
                $maxDistance: parseInt(distance)
              }
            }
          }).toArray();
        }
      } else if (req.body.postcode) {
        // If we have a post code search for possible entries
        var postCode = await postcodes.findOne({ name: req.body.postcode });
        // Locate by post code
        if (postCode != null) {
          // Search for pubs based on post code
          pubDocs = await pubs.find({
            geometry: {
              $geoWithin: {
                $geometry: postCode.geometry
              }
            }
          }).toArray();
        }
      }

      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: doc,
        address: address,
        moment: moment,
        pubs: pubDocs 
      });
  });

  router.get('/crawls',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      console.dir(req.user)
      // Read all the pub crawls
      var documents = await crawl.findByUsername(req.user.username, {createdOn: -1});
      // Render the view
      res.render('admin/crawls', { 
        user: req.user, 
        url: generateUrl(req.baseUrl), 
        documents: documents,
        moment: moment 
      });
  });

  router.get('/crawls/publish/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Publish the crawl
      await crawls.updateOne({
        _id: new ObjectId(req.params.crawlId)
      }, {
        $set: {
          published: true,
          publishedOn: new Date()
        }
      });

      // Read all the pub crawls
      var documents = await crawl.findByUsername(req.user.username, {createdOn: -1});
      // Render the view
      res.render('admin/crawls', { 
        user: req.user, 
        url: generateUrl(req.baseUrl), 
        documents: documents,
        moment: moment  
      });      
  });

  router.get('/crawls/unpublish/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Publish the crawl
      await crawls.updateOne({
        _id: new ObjectId(req.params.crawlId)
      }, {
        $set: {
          published: false
        },
        $unset: {
          publishedOn: true
        }
      });

      // Read all the pub crawls
      var documents = await crawl.findByUsername(req.user.username, {createdOn: -1});
      // Render the view
      res.render('admin/crawls', { 
        user: req.user, 
        url: generateUrl(req.baseUrl), 
        documents: documents,
        moment: moment 
      });      
    });

  router.get('/crawls/create/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Fetch the associated pub crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
      
      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: doc,
        address: address,
        moment: moment,
        pubs: []
      });
  });

  router.get('/crawls/create',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    (req, res) => {
      res.render('admin/crawls/create', { 
        user: req.user, 
        url: generateUrl(req.baseUrl), 
        options: options,
        address: address,
        moment: moment,
        pubs: [],
        crawl: {} 
      });
  });

  router.post('/crawls/update/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Check if the user exists
      var errors = {};
      if (req.body.name == null || req.body.name == '') {
        errors['name'] = 'name cannot be null or empty';
      }

      if (req.body.description == null || req.body.description == '') {
        errors['description'] = 'description cannot be null or empty';
      }

      // Check for start time
      if (req.body.fromdate == null || req.body.fromdate == '') {
        errors['fromdate'] = 'Start date cannot be null or empty';
      }

      // Check for start time
      if (req.body.todate == null || req.body.todate == '') {
        errors['todate'] = 'End date cannot be null or empty';
      }

      // Update the crawl
      if (Object.keys(errors).length == 0) {
        await crawls.updateOne({
          _id: ObjectId(req.params.crawlId)
        }, {
          $set: {
            name: req.body.name,
            description: req.body.description,
            from: new Date(req.body.fromdate),
            to: new Date(req.body.todate)
          }
        });
      }

      // Fetch the associated pub crawl
      var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        errors: errors, 
        url: generateUrl(req.baseUrl), 
        crawl: doc,
        address: address,
        moment: moment,
        pubs: []
      });
  });

  router.post('/crawls/create',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Check if the user exists
      var errors = {};
      if (req.body.name == null || req.body.name == '') {
        errors['name'] = 'name cannot be null or empty';
      }

      if (req.body.description == null || req.body.description == '') {
        errors['description'] = 'description cannot be null or empty';
      }
      
      // Check for start time
      if (req.body.fromdate == null || req.body.fromdate == '') {
        errors['fromdate'] = 'Start date cannot be null or empty';
      }

      // Check for start time
      if (req.body.todate == null || req.body.todate == '') {
        errors['todate'] = 'End date cannot be null or empty';
      }

      // We have an error render with errors
      if (Object.keys(errors).length > 0) {
        return res.render('crawls/create', { 
          url: generateUrl(req.baseUrl), 
          errors: errors, 
          options: options,
          values: req.body
        });
      }

      // No errors, lets save the pub crawl initial document
      var crawl = {
        _id: ObjectId(),
        name: req.body.name,
        description: req.body.description,
        username: req.user.username,
        from: new Date(req.body.fromdate),
        to: new Date(req.body.todate),
        createdOn: new Date(),
        published: false,
        pubs: []
      };

      await crawls.insertOne(crawl);

      // Render the create with associated newly created object
      res.render('admin/crawls/create', { 
        crawl: crawl, 
        url: generateUrl(req.baseUrl),
        address: address,
        pubs: [],
        moment: moment,
        options: options
      });
  });

  return router
};

function address(pub) {
  var parts = [];

  if (pub.street) parts.push(pub.street);
  if (pub.housenumber) parts.push(pub.housenumber);
  if (pub.city) parts.push(pub.city);
  if (pub.postcode) parts.push(pub.postcode);
  return parts.join(",");
}

function generateUrl(baseUrl) {
  return (url) => {
    return `${baseUrl}/${url}`;
  }
}