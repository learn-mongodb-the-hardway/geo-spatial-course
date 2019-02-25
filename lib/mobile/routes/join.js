const { Crawl } = require('../../models/crawl');
const { ObjectId } = require('mongodb');
const { generateUrl } = require('../shared');

async function joinGet(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Grab the crawl doc
  var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

  // No doc found
  if (!doc) {
    return res.redirect(`${req.baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${req.params.crawlId} not found `)}`);
  }

  // Are we logged in
  if (req.session.loggedIn && req.session.userId) {
    // Add the user to the crawl
    // We are going to add the user to the crawl as an
    // attendant 
    const result = await crawls.updateOne({
      _id: doc._id
    }, {
      $addToSet: {
        attendants: req.session.userId
      }
    });
    
    // Set the crawlId on the session object
    req.session.crawlId = doc._id;

    // Render the view of the crawl
    return res.redirect(req.baseUrl);
  }

  // Send all the open crawls
  res.render('mobile/join.ejs', {
    doc: doc, url: generateUrl(req.baseUrl), errors: {}, values: {}
  });
}

module.exports = {
  joinGet
}