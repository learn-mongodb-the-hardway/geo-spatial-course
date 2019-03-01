const moment = require('moment');
const { generateUrl } = require('../../shared');

async function crawlsGet(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');

  // Unpack variables
  const username = req.user.username;
  const user = req.user;
  const baseUrl = req.baseUrl;

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

module.exports = { crawlsGet };
