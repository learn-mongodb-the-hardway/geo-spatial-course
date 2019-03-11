const { generateUrl, address } = require('../../../shared');
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
  // Unpack variables
  const options = req.options;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const crawlId = req.params.crawlId;

  // Fetch the associated pub crawl
  var doc = await req.models.crawl.findOneByIdFull(new ObjectId(crawlId));

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
  // Unpack the variables
  const values = req.body;
  const name = req.body.name || '';
  const description = req.body.description || '';
  const username = req.user.username || '';
  const fromdate = req.body.fromdate || '';
  const todate = req.body.todate || '';
  const options = req.options;
  const baseUrl = req.baseUrl;

  // Pub crawl document id
  const id = ObjectId();

  // Insert the doc
  const errors = await req.models.crawl.create(
    id, name, description, username, new Date(fromdate), new Date(todate), false, [], {}
  );

  // We have an error render with errors
  if (Object.keys(errors).length > 0) {
    return res.render('admin/crawls/create.ejs', { 
      url: generateUrl(baseUrl), 
      errors: errors, 
      options: options,
      crawl: values
    });
  }

  // Get the document
  const doc = await req.models.crawl.findOneById(id);
  
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