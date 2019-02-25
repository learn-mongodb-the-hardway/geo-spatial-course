const { Crawl } = require('../../models/crawl');
const { ObjectId } = require('mongodb');
const { generateUrl } = require('../shared');
const crypto = require('crypto');

async function loginPost(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');
  const pubs = req.db.collection('pubs');
  const attendants = req.db.collection('attendants');
  const crawl = new Crawl(crawls);

  // Grab the crawl doc
  var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
  var errors = {};

  // No doc found
  if (!doc) {
    return res.redirect(`${req.baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${req.params.crawlId} not found `)}`);
  }

  // Unpack the variables
  const username = req.body.username || '';
  const password = req.body.password || '';

  if (username.length == 0) {
    errors['username'] = `Username cannot be empty`;
  }

  if (password.length == 0) {
    errors['password'] = `Password cannot be empty`;
  }

  // Hash the password
  const hash = crypto.createHash('sha256');
  hash.write(password);
  const hashedPassword = hash.digest('hex');

  // Check if the user exists
  const attendant = await attendants.findOne({
    username: username,
    password: hashedPassword
  });

  // No user
  if (attendant == null) {
    errors['error'] = `User does not exist or password is wrong`;
  }

  // If we have errors render the form with the errors
  if (Object.keys(errors).length > 0) {
    return res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
    });     
  }

  // We are going to add the user to the crawl as an
  // attendant 
  const result = await crawls.updateOne({
    _id: doc._id
  }, {
    $addToSet: {
      attendants: attendant._id
    }
  });

  // If we have errors render the form with the errors
  if (Object.keys(errors).length > 0) {
    return res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
    });     
  }

  // Set the session crawl id
  req.session.loggedIn = true;
  req.session.crawlId = doc._id;
  req.session.userId = attendant._id;

  // Render the view of the pub crawl
  res.redirect(req.baseUrl);
}

module.exports = { loginPost };