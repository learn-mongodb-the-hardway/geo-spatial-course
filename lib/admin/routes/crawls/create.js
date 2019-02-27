const { generateUrl, address } = require('../../../shared');
const { Crawl } = require('../../../models/crawl');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function createCrawlGet(req, res) {
  // Unpack variables
  const options = req.options;
  const baseUrl = req.baseUrl;
  const user = req.user;

  res.render('admin/crawls/create.ejs', { 
    user: user, 
    url: generateUrl(baseUrl), 
    options: options,
    address: address,
    moment: moment,
    pubs: [],
    errors: {},
    crawl: {} 
  });
};

async function createCrawlIdGet(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack variables
  const options = req.options;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const crawlId = req.params.crawlId;

  // Fetch the associated pub crawl
  var doc = await crawl.findFull(new ObjectId(crawlId));

  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${crawlId}`)}`)
  }
  
  // Render the edit pub crawl view
  res.render('admin/crawls/create.ejs', { 
    user: user, 
    options: options,
    url: generateUrl(baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    errors: {},
    pubs: []
  });
};

async function createCrawlPost(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');

  // Unpack the variables
  const values = req.body;
  const name = req.body.name || '';
  const description = req.body.description || '';
  const username = req.user.username || '';
  const fromdate = req.body.fromdate || '';
  const todate = req.body.todate || '';
  const options = req.options;
  const baseUrl = req.baseUrl;

  // Check if the user exists
  var errors = {};
  if (name == '') {
    errors['name'] = 'name cannot be null or empty';
  }

  if (description == '') {
    errors['description'] = 'description cannot be null or empty';
  }
  
  // Check for start time
  if (fromdate == '') {
    errors['fromdate'] = 'Start date cannot be null or empty';
  }

  // Check for start time
  if (todate == '') {
    errors['todate'] = 'End date cannot be null or empty';
  }

  // We have an error render with errors
  if (Object.keys(errors).length > 0) {
    return res.render('admin/crawls/create.ejs', { 
      url: generateUrl(baseUrl), 
      errors: errors, 
      options: options,
      crawl: values
    });
  }

  // No errors, lets save the pub crawl initial document
  var doc = {
    _id: ObjectId(),
    name: name,
    description: description,
    username: username,
    from: new Date(fromdate),
    to: new Date(todate),
    createdOn: new Date(),
    published: false,
    pubs: []
  };

  // Insert the doc
  await crawls.insertOne(doc);
  
  // Render the create with associated newly created object
  res.render('admin/crawls/create.ejs', { 
    crawl: doc, 
    url: generateUrl(baseUrl),
    address: address,
    pubs: [],
    errors: {},
    moment: moment,
    options: options
  });
};

module.exports = { createCrawlGet, createCrawlIdGet, createCrawlPost };