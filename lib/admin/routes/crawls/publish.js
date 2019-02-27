const { Crawl } = require('../../../models/crawl');
const { generateUrl } = require('../../../shared');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function publishGet(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack body
  const crawlId = req.params.crawlId;
  const username = req.user.username;
  const user = req.user;
  const baseUrl = req.baseUrl;

  // Publish the crawl
  const result = await crawl.publish(new ObjectId(crawlId));

  // Crawl failed to update
  if (result.modifiedCount == 0) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${crawlId}`)}`)
  }

  // Read all the pub crawls
  var documents = await crawl.findByUsername(username, {createdOn: -1});
  
  // Render the view
  res.render('admin/crawls.ejs', { 
    user: user, 
    url: generateUrl(baseUrl), 
    documents: documents,
    moment: moment  
  });      
}

module.exports = { publishGet };