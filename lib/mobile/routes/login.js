const { Crawl } = require('../../models/crawl');
const { User } = require('../../models/user');
const { ObjectId } = require('mongodb');
const { generateUrl } = require('../../shared');
const crypto = require('crypto');

async function loginPost(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack variables
  const crawlId = req.params.crawlId;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const session = req.session;

  // Grab the crawl doc
  var doc = await crawl.findFull(new ObjectId(crawlId));

  // No doc found
  if (!doc) {
    return res.redirect(`${baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${crawlId} not found `)}`);
  }

  // We are going to add the user to the crawl as an
  // attendant 
  await crawls.updateOne({
    _id: doc._id
  }, {
    $addToSet: {
      attendants: user._id
    }
  });

  // Set the session crawl id
  session.loggedIn = true;
  session.crawlId = doc._id;
  session.userId = user._id;

  // Render the view of the pub crawl
  res.redirect(baseUrl);
}

module.exports = { loginPost };