const { Crawl } = require('../../../lib/models/crawl');
const moment = require('moment');
const { generateUrl } = require('../../shared');

async function crawlsGet(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack variables
  const username = req.user.username;
  const user = req.user;
  const baseUrl = req.baseUrl;

  // Read all the pub crawls
  var documents = await crawl.findByUsername(username, {createdOn: -1});

  // Render the view
  res.render('admin/crawls.ejs', { 
    user: user, 
    url: generateUrl(baseUrl), 
    documents: documents,
    moment: moment 
  });
};

module.exports = { crawlsGet };
