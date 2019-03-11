const { generateUrl, address } = require('../../../shared');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function updatePost(req, res) {
  // Unpack body
  const crawlId = req.params.crawlId;
  const options = req.options;
  const user = req.user;
  const name = req.body.name;
  const description = req.body.description;
  const fromdate = req.body.fromdate;
  const todate = req.body.todate;
  const baseUrl = req.baseUrl;

  // Update the crawl
  const errors = await req.models.crawl.update(ObjectId(crawlId), name, description, new Date(fromdate), new Date(todate));

  // Fetch the associated pub crawl
  var doc = await req.models.crawl.findOneByIdFull(new ObjectId(crawlId));

  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${crawlId}`)}`)
  }
  
  // Render the edit pub crawl view
  res.render('admin/crawls/create.ejs', { 
    user: user, 
    options: options,
    errors: errors, 
    url: generateUrl(baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    errors: errors,
    pubs: []
  });
};

module.exports = { updatePost };