const { Crawl } = require('../../models/crawl');
const { ObjectId } = require('mongodb');
const { generateUrl } = require('../../shared');
const crypto = require('crypto');

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

async function joinPost(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');
  const attendants = req.db.collection('attendants');
  const crawl = new Crawl(crawls);

  // Grab the crawl doc
  var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
  var errors = {};

  // No doc found
  if (!doc) {
    return res.redirect(`${req.baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${req.params.crawlId} not found `)}`);
  }

  // Get the fields
  const name = req.body.name || '';
  const username = req.body.username || '';
  const password = req.body.password || '';

  // Validate the input
  if (name.length == 0) {
    errors['name'] = `Name cannot be empty`;
  }

  if (username.length == 0) {
    errors['username'] = `Username cannot be empty`;
  }

  if (password.length == 0) {
    errors['password'] = `Password cannot be empty`;
  }

  // If check if the user exists
  const attendant = await attendants.findOne({
    username: username
  });

  // If the user exists already
  if (attendant != null) {
    errors['error'] = `Username already exists`;
  }

  // If no errors let's crate the user
  if (Object.keys(errors).length > 0) {
    return res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
    });     
  }

  // Hash the password
  const hash = crypto.createHash('sha256');
  hash.write(password);

  // Create user id
  const id = ObjectId();

  // Create a user
  await attendants.insertOne({
    _id: id,
    name: name,
    username: username,
    password: hash.digest('hex'),
    createdOn: new Date()
  });

  // Add the user to the crawl
  // We are going to add the user to the crawl as an
  // attendant 
  const result = await crawls.updateOne({
    _id: doc._id
  }, {
    $addToSet: {
      attendants: id
    }
  });

  if (result.modifiedCount == 0) {
    errors['error'] = `Pub crawl does not exist`;
  }

  // If we have errors render the form with the errors
  if (Object.keys(errors).length > 0) {
    return res.render('mobile/join.ejs', {
      doc: doc, url: generateUrl(req.baseUrl), errors: errors, values: req.body
    });     
  }

  // Set the session crawl id
  req.session.loggedIn = true;
  req.session.crawlId = doc._id;
  req.session.userId = id;

  // Render the view of the pub crawl
  res.redirect(req.baseUrl);
}

module.exports = {
  joinGet, joinPost
}