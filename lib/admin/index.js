const express = require('express');
const passport = require('passport');
const cors = require('cors');
const { Strategy } = require('passport-local');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

// Routes
const { loginGet, loginPost } = require('./routes/login');
const { logoutGet } = require('./routes/logout');
const { createGet, createPost } = require('./routes/create');
const { locationSetGet, locationFindPost } = require('./routes/crawls/location');
const { pubAddPost, pubDeleteGet, pubFindPost, pubMoveupGet } = require('./routes/crawls/pub');
const { createGet, createCrawlIdGet, createPost } = require('./routes/crawls/create');
const { crawlsGet } = require('./routes/crawls');
const { publishGet } = require('./routes/publish');
const { unpublishGet } = require('./routes/unpublish');
const { updatePost } = require('./routes/update');

module.exports = (options) => {
  // Configure the router
  var router = express.Router();
  router.use(cors());
  router.options('*', cors());

  router.use(require('cookie-parser')());
  router.use(require('body-parser').urlencoded({ extended: true }));
  router.use(require('body-parser').json());
  router.use(require('express-session')({ secret: options.secret, resave: false, saveUninitialized: false }));

  // Configure the routes
  router.get('/login', loginGet);
  router.post('/login', passport.authenticate('local', { failureRedirect: '/admin/login' }), loginPost);
  router.get('/logout', logoutGet);
  router.get('/create', createGet);
  router.post('/create', createPost);

  router.get('/crawls/location/set/:crawlId/:addressId', 
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), locationSetGet);
  router.post('/crawls/location/find/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), locationFindPost);

  router.post('/crawls/pub/add/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), pubAddPost);
  router.get('/crawls/pub/delete/:crawlId/:pubId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), pubDeleteGet);
  router.get('/crawls/pub/moveup/:crawlId/:pubId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), pubMoveupGet);
  router.post('/crawls/pub/find/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), pubFindPost);

  router.get('/crawls/create',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), createGet);
  router.get('/crawls/create/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), createCrawlIdGet);
  router.post('/crawls/create',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), createPost);

  router.get('/crawls',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), crawlsGet);

  router.get('/crawls/publish/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), publishGet);
    
  router.get('/crawls/unpublish/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), unpublishGet);
    
  router.post('/crawls/update/:crawlId',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'), updatePost);

  // Get the user collection
  const users = options.db.collection('users');

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

  // Return the router
  return router
};