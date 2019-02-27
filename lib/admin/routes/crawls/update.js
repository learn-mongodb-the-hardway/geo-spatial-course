const { Crawl } = require('../../../models/crawl');
const { generateUrl, address } = require('../../../shared');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function updatePost(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack body
  const crawlId = req.params.crawlId;
  const options = req.options;
  const user = req.user;
  const name = req.body.name || '';
  const description = req.body.description || '';
  const fromdate = req.body.fromdate || '';
  const todate = req.body.todate || '';
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

  // Update the crawl
  if (Object.keys(errors).length == 0) {
    await crawl.update(ObjectId(crawlId), name, description, new Date(fromdate), new Date(todate));
  }

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
    errors: errors, 
    url: generateUrl(baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    errors: errors,
    pubs: []
  });
};

module.exports = { updatePost };