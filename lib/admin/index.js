const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-local');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

module.exports = (options) => {
  var router = express.Router();
  router.use(require('cookie-parser')());
  router.use(require('body-parser').urlencoded({ extended: true }));
  router.use(require('express-session')({ secret: options.secret, resave: false, saveUninitialized: false }));
  
  // Get the user collection
  var users = options.db.collection('users');

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

  router.get('/crawls',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'),
    (req, res) => {
      res.render('admin/crawls', { user: req.user, url: generateUrl(req.baseUrl) });
    });
  
  router.get('/crawls/create',
    require('connect-ensure-login').ensureLoggedIn('/admin/login'),
    (req, res) => {
      res.render('admin/crawls', { user: req.user, url: generateUrl(req.baseUrl) });
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

  return router
};

function generateUrl(baseUrl) {
  return (url) => {
    return `${baseUrl}/${url}`;
  }
}