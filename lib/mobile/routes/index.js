const { Crawl } = require('../../models/crawl');
const { ObjectId } = require('mongodb');

async function indexGet(req, res) {
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack variables
  const user = req.user;
  const crawlId = req.session.crawlId;
  const options = req.options;
  const error = req.params.error;

  // Are we logged in an part of a existing crawl
  if (user && crawlId) {
    // Get the associated (crawl, if still active)
    const doc = await crawl.findByIdAndDates(ObjectId(crawlId), new Date());
    // If we have an active crawl, render it
    if (doc) {
      return res.render('mobile/crawl.ejs', {
        doc: doc, options: options
      });
    }
  }

  // Did we get an error passed via a redirect
  const errors = {};
  if (error) {
    errors['error'] = error;
  }

  res.render('mobile/index.ejs', {
    options: options, errors: errors
  });
};

async function indexPost(req, res) {
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls)

  // Unpack the geo parameters
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const timestamp = req.body.timestamp;

  // Get any crawls that are in the area
  const docs = await crawl.findIntersectWithPointAndDates([longitude, latitude], new Date(timestamp));
  // Send all the open crawls
  res.render('mobile/pub_crawls.ejs', {
    crawls: docs
  });
};

module.exports = { indexGet, indexPost };