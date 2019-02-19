const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-local');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

class Crawl {
  constructor(collection) {
    this.collection = collection;
  }

  async findByUsername(username, sort) {
    if (sort == null) sort = {createdOn: -1};
    return await this.collection.find({
      username: username
    }).sort(sort).toArray();
  }

  async removePub(id, pubId) {
    return await crawls.updateOne({
      _id: id, 
      pubs: pubId
    }, {
      $pull: { pubs: pubId }
    });
  }

  async movePubUp(id, pubId) {
    var crawl = await this.collection.findOne({
      _id: id
    });

    var updatePubs = [];

    crawl.pubs.forEach((id, index) => {
      if (id.toString() == pubId.toString()) {
        var otherId = crawl.pubs[index - 1];
        updatePubs[index] = otherId;
        updatePubs[index - 1] = id;
      } else {
        updatePubs[index] = id;
      }
    });

    crawl.pubs = updatePubs;

    return await this.collection.updateOne({
      _id: id
    }, {
      $set: {
        pubs: crawl.pubs
      }
    });
  }

  async findFull(id) {
    var document = await this.collection.aggregate([{
      $match: {
        _id: id
      }
    }, {
      $lookup: {
        from: 'pubs',
        let: { pubIds: "$pubs" },
        pipeline: [{
          $match: {
            $expr: {
              $in: ["$_id", "$$pubIds"]
            }
          }
        }],
        as: "pubsFull"
      }
    }, {
      $project: {
        _id: "$_id",
        name: "$name",
        description: "$description",
        pubsOrdered: "$pubs",
        pubs: "$pubsFull"
      }
    }]).next();

    // Set the sorted pubs
    document.pubs = document.pubsOrdered.map(id => {
      for (var obj of document.pubs) {
        if (obj._id.toString() == id.toString()) {
          return obj;
        }
      }
    });

    // Return the final document
    return document;
  }
}

module.exports = (options) => {
  var router = express.Router();
  router.use(require('cookie-parser')());
  router.use(require('body-parser').urlencoded({ extended: true }));
  router.use(require('body-parser').json());
  router.use(require('express-session')({ secret: options.secret, resave: false, saveUninitialized: false }));
  
  // Get the user collection
  const users = options.db.collection('users');
  const crawls = options.db.collection('crawls');
  const pubs = options.db.collection('pubs');
  const postcodes = options.db.collection('postcodes');

  // Configure the local strategy for use by Passport.
  //
  // The local strategy require a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy(
    (username, password, cb) => {
      users.findOne({
        username: username 
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
  
  // Set dummy user
  router.use((req, res, next) => {
    req.user = {username: 'admin'}
    next();
  });

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
    res.redirect(`${req.baseUrl}`);
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
        url: generateUrl(req.baseUrl), errors: errors, values: req.body
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
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Add the pub to the list
      var result = crawls.updateOne({
        _id: new ObjectId(req.params.crawlId)
      }, {
        $push: { pubs: new ObjectId(req.body._id) }
      });

      // Get the crawl
      var crawl = await (new Crawl(crawls)).findFull(new ObjectId(req.params.crawlId));

      // Render the pub list
      res.render('partials/admin/crawls/list', {
         user: req.user, url: generateUrl(req.baseUrl), crawl: crawl, address: address 
      });
  });

  /**
   * End points to create new Pub Crawls
   */
  router.get('/crawls/pub/delete/:crawlId/:pubId',
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Get the crawler
      var crawl = new Crawl(crawls);

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
        pubs: [] 
      });
  });

  router.get('/crawls/pub/moveup/:crawlId/:pubId',
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Get the crawler
      var crawl = new Crawl(crawls);

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
        pubs: [] 
      });
  });

  router.post('/crawls/pub/find/:crawlId',
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Fetch the associated pub crawl
      var crawl = await (new Crawl(crawls)).findFull(new ObjectId(req.params.crawlId));

      var pubDocs = [];

      // If we have a post code search for possible entries
      if (req.body.postcode) {
        var postCode = await postcodes.findOne({ name: req.body.postcode });

        // Search for pubs based on post code
        pubDocs = await pubs.find({
          geometry: {
            $geoWithin: {
              $geometry: postCode.geometry
            }
          }
        }).toArray();
      }

      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: crawl,
        address: address,
        pubs: pubDocs 
      });
  });

  router.get('/crawls',
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Read all the pub crawls
      var documents = await (new Crawl(crawls)).findByUsername(req.user.username, {createdOn: -1});
      // Render the view
      res.render('admin/crawls', { user: req.user, url: generateUrl(req.baseUrl), documents: documents });
  });

  router.get('/crawls/create/:crawlId',
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    async (req, res) => {
      // Fetch the associated pub crawl
      var crawl = await (new Crawl(crawls)).findFull(new ObjectId(req.params.crawlId));
      
      // Render the edit pub crawl view
      res.render('admin/crawls/create', { 
        user: req.user, 
        options: options,
        url: generateUrl(req.baseUrl), 
        crawl: crawl,
        address: address,
        pubs: []
      });
  });

  router.get('/crawls/create',
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    (req, res) => {
      res.render('admin/crawls/create', { user: req.user, url: generateUrl(req.baseUrl), crawl: {} });
  });

  router.post('/crawls/create',
    // require('connect-ensure-login').ensureLoggedIn('/admin/login'), 
    (req, res) => {
      // Check if the user exists
      var errors = {};
      if (req.body.name == null || req.body.name == '') {
        errors['name'] = 'name cannot be null or empty';
      }

      if (req.body.description == null || req.body.description == '') {
        errors['description'] = 'description cannot be null or empty';
      }
      
      // We have an error render with errors
      if (Object.keys(errors).length > 0) {
        return res.render('crawls/create', { 
          url: generateUrl(req.baseUrl), errors: errors, values: req.body
        });
      }

      // No errors, lets save the pub crawl initial document
      var crawl = {
        _id: ObjectId(),
        name: req.body.name,
        description: req.body.description,
        username: req.user.username,
        createdOn: new Date(),
        published: false,
        pubs: []
      };
      crawls.insertOne(crawl);

      // Render the create with associated newly created object
      res.render('admin/crawls/create', { crawl: crawl, url: generateUrl(req.baseUrl) });
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