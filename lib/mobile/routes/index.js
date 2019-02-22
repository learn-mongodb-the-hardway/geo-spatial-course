const { Crawl } = require('../../models/crawl');

async function indexGet(req, res) {
  const crawls = req.db.collection('crawls');
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

  res.render('mobile/index.ejs', {
    options: req.options
  });
};

async function indexPost(req, res) {
  const crawls = req.db.collection('crawls');
  // Unpack the geo parameters
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const timestamp = req.body.timestamp;

  // Get any crawls that are in the area
  const docs = await crawls.find({
    'location.polygon': {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    },
    from: {
      $lte: new Date(timestamp)
    },
    to: {
      $gte: new Date(timestamp)
    }
  }).toArray();

  // Send all the open crawls
  res.render('mobile/pub_crawls.ejs', {
    crawls: docs
  });
};

module.exports = { indexGet, indexPost };