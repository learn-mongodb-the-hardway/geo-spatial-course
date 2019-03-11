const { generateUrl } = require('../../../shared');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function unpublishGet(req, res) {
  // Unpack body
  const crawlId = req.params.crawlId;
  const username = req.user.username;
  const user = req.user;
  const baseUrl = req.baseUrl;

  // Publish the crawl
  const result = await req.models.crawl.unpublish(new ObjectId(crawlId));

  // Crawl failed to update
  if (result.matchedCount == 0) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${crawlId}`)}`)
  }

  // Read all the pub crawls
  var documents = await req.models.crawl.findByUsername(username, {createdOn: -1});
  // Render the view
  res.render('admin/crawls.ejs', { 
    user: user, 
    url: generateUrl(baseUrl), 
    documents: documents,
    moment: moment 
  });      
};

module.exports = { unpublishGet };