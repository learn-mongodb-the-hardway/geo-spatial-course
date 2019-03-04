const { ObjectId } = require('mongodb');

async function indexGet(req, res) {
  // Unpack variables
  const user = req.user;
  const crawlId = req.session.crawlId;
  const options = req.options;
  const error = req.params.error;

  // Are we logged in an part of a existing crawl
  if (user && crawlId) {
    // Get the associated (crawl, if still active)
    const doc = await req.models.crawl.findByIdAndDates(ObjectId(crawlId), new Date());
    // If we have an active crawl, render it
    if (doc) {
      return res.render('mobile/crawl.ejs', {
        doc: doc, options: options, messages: req.flash('error')
      });
    }
  }

  // Did we get an error passed via a redirect
  const errors = {};
  if (error) {
    errors['error'] = error;
  }

  res.render('mobile/index.ejs', {
    options: options, errors: errors, messages: req.flash('error')
  });
};

async function indexPost(req, res) {
  // Unpack the geo parameters
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const timestamp = req.body.timestamp;

  // Get any crawls that are in the area
  const docs = await req.models.crawl.findIntersectWithPointAndDates([longitude, latitude], new Date(timestamp));
  // Send all the open crawls
  res.render('mobile/pub_crawls.ejs', {
    crawls: docs
  });
};

module.exports = { indexGet, indexPost };