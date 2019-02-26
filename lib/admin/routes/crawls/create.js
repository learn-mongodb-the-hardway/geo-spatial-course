const { MapBoxServices } = require('../../../mapbox');
const { generateUrl, address } = require('../../../shared');
const { Crawl } = require('../../../models/crawl');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function createGet(req, res) {
  res.render('admin/crawls/create', { 
    user: req.user, 
    url: generateUrl(req.baseUrl), 
    options: options,
    address: address,
    moment: moment,
    pubs: [],
    crawl: {} 
  });
};

async function createCrawlIdGet(req, res) {
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
};

async function createPost(req, res) {
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
};

module.exports = { createGet, createCrawlIdGet, createPost };