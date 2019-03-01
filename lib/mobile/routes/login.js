const { ObjectId } = require('mongodb');

async function loginPost(req, res) {
  // Unpack variables
  const crawlId = req.params.crawlId;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const session = req.session;

  // Grab the crawl doc
  var doc = await req.models.crawl.findFull(new ObjectId(crawlId));

  // No doc found
  if (!doc) {
    return res.redirect(`${baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${crawlId} not found `)}`);
  }

  // We are going to add the user to the crawl as an
  // attendant 
  await req.models.crawl.addAttendant(doc._id, user._id);

  // Set the session crawl id
  session.loggedIn = true;
  session.crawlId = doc._id;
  session.userId = user._id;

  // Render the view of the pub crawl
  res.redirect(baseUrl);
}

module.exports = { loginPost };