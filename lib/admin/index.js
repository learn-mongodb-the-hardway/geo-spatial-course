const express = require('express');
const passport = require('passport');

// Routes
const { loginGet, loginPost } = require('./routes/login');
const { logoutGet } = require('./routes/logout');
const { createGet, createPost } = require('./routes/create');
const { locationSetGet, locationFindPost } = require('./routes/crawls/location');
const { pubAddPost, pubDeleteGet, pubFindPost, pubMoveupGet } = require('./routes/crawls/pub');
const { createCrawlGet, createCrawlIdGet, createCrawlPost } = require('./routes/crawls/create');
const { crawlsGet } = require('./routes/crawls');
const { publishGet } = require('./routes/crawls/publish');
const { unpublishGet } = require('./routes/crawls/unpublish');
const { updatePost } = require('./routes/crawls/update');
const { ensureLoggedIn } = require('../shared');

// Create a route
const router = express.Router();

// Configure the routes
router.get('/login', loginGet);
router.post('/login', passport.authenticate('local', { 
  failureRedirect: '/admin/login', failureFlash : 'User or password is incorrect' }), loginPost);
router.get('/logout', logoutGet);
router.get('/create', createGet);
router.post('/create', createPost);

router.get('/crawls/location/set/:crawlId/:addressId', 
  ensureLoggedIn('admin', '/admin/login'), locationSetGet);
router.post('/crawls/location/find/:crawlId',
  ensureLoggedIn('admin', '/admin/login'), locationFindPost);

router.post('/crawls/pub/add/:crawlId',
  ensureLoggedIn('admin', '/admin/login'), pubAddPost);
router.get('/crawls/pub/delete/:crawlId/:pubId',
  ensureLoggedIn('admin', '/admin/login'), pubDeleteGet);
router.get('/crawls/pub/moveup/:crawlId/:pubId',
  ensureLoggedIn('admin', '/admin/login'), pubMoveupGet);
router.post('/crawls/pub/find/:crawlId',
  ensureLoggedIn('admin', '/admin/login'), pubFindPost);

router.get('/crawls/create',
  ensureLoggedIn('admin', '/admin/login'), createCrawlGet);
router.get('/crawls/create/:crawlId',
  ensureLoggedIn('admin', '/admin/login'), createCrawlIdGet);
router.post('/crawls/create',
  ensureLoggedIn('admin', '/admin/login'), createCrawlPost);

router.get('/crawls',
  ensureLoggedIn('admin', '/admin/login'), crawlsGet);

router.get('/crawls/publish/:crawlId',
  ensureLoggedIn('admin', '/admin/login'), publishGet);
  
router.get('/crawls/unpublish/:crawlId',
  ensureLoggedIn('admin', '/admin/login'), unpublishGet);
  
router.post('/crawls/update/:crawlId',
  ensureLoggedIn('admin', '/admin/login'), updatePost);

module.exports = router;