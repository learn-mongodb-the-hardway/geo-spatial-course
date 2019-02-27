const { Crawl } = require('../../models/crawl');

async function indexGet(req, res) {
  const crawls = req.db.collection('crawls');
  const errors = {};

  // Are we logged in an part of a existing crawl
  if (req.session.loggedIn && req.session.crawlId) {
    // Get the associated (crawl, if still active)
    const doc = await new Crawl(crawls).findByUserNameAndDates(req.session.crawlId, new Date());
    // If we have an active crawl, render it
    if (doc) {
      return res.render('mobile/crawl.ejs', {
        doc: doc, options: req.options
      });
    }
  }

  // Did we get an error passed via a redirect
  if (req.params.error) {
    errors['error'] = req.params.error;
  }

  res.render('mobile/index.ejs', {
    options: req.options, errors: errors
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