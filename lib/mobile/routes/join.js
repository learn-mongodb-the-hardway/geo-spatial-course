const { ObjectId } = require('mongodb');
const { generateUrl } = require('../../shared');
const crypto = require('crypto');

async function joinGet(req, res) {
  // Unpack the variables
  const crawlId = req.params.crawlId;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const session = req.session;

  // Grab the crawl doc
  var doc = await req.models.crawl.findOneByIdFull(new ObjectId(crawlId));

  // No doc found
  if (!doc) {
    return res.redirect(`${baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${crawlId} not found `)}`);
  }

  // Are we logged in
  if (user) {
    // Add the user to the crawl
    // We are going to add the user to the crawl as an
    // attendant 
    await req.models.crawl.addAttendant(doc._id, user._id);
    
    // Set the crawlId on the session object
    session.crawlId = doc._id;

    // Render the view of the crawl
    return res.redirect(req.baseUrl);
  }

  // Send all the open crawls
  res.render('mobile/join.ejs', {
    doc: doc, url: generateUrl(baseUrl), errors: {}, values: {}
  });
}

async function joinPost(req, res) {
  // Unpack variables
  const crawlId = req.params.crawlId;
  const baseUrl = req.baseUrl;
  const name = req.body.name || '';
  const username = req.body.username || '';
  const password = req.body.password || '';
  const body = req.body;
  const session = req.session;

  // Grab the crawl doc
  var doc = await req.models.crawl.findOneByIdFull(new ObjectId(crawlId));

  // No doc found
  if (!doc) {
    return res.redirect(`${baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${crawlId} not found `)}`);
  }

  // Create user id
  const id = ObjectId();

  // Create a user
  const errors = await req.models.user.create(id, name, username, password, password, {});

  // If we have errors on user creation
  if (Object.keys(errors).length > 0) {
    return res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(baseUrl), errors: errors, values: body
    });     
  }

  // Add the user to the crawl
  // We are going to add the user to the crawl as an
  // attendant 
  const result = await req.models.crawl.addAttendant(doc._id, id);

  if (result.modifiedCount == 0) {
    errors['error'] = `Pub crawl does not exist`;
  }

  // If we have errors render the form with the errors
  if (Object.keys(errors).length > 0) {
    return res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(baseUrl), errors: errors, values: body
    });     
  }

  // Set the session crawl id
  session.loggedIn = true;
  session.crawlId = doc._id;
  session.userId = id;

  // Render the view of the pub crawl
  res.redirect(baseUrl);
}

module.exports = {
  joinGet, joinPost
}