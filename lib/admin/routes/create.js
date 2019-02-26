const { generateUrl } = require('../../shared');
const crypto = require('crypto');

async function createGet(req, res) {
  res.render('admin/create', { 
    url: generateUrl(req.baseUrl), errors: {}, values: {}
  });
};

async function createPost(req, res) {
  // Get collections
  const users = req.db.collection('users');

  // Check if the user exists
  var errors = {};
  if (req.body.username == null || req.body.username == '') {
    errors['username'] = 'username cannot be null or empty';
  }

  if (req.body.password == null || req.body.password == '') {
    errors['password'] = 'password cannot be null or empty';
  }

  if (req.body.password != req.body.confirm_password) {
    errors['confirm_password'] = 'password and confirm password must be equal';
  }

  // Check if the user exists
  var user = await users.find({ username: req.body.username });
  if (user == null) {
    errors['user'] = `user ${req.body.username} already exists`;
  }

  // We have an error render with errors
  if (Object.keys(errors).length > 0) {
    return res.render('admin/create', { 
      url: generateUrl(req.baseUrl), errors: errors, values: req.body, options: options
    });
  }

  // Hash the password
  const hash = crypto.createHash('sha256');
  hash.write(req.body.password);

  // Create a user
  await users.insertOne({
    username: req.body.username,
    password: hash.digest('hex'),
    createdOn: new Date()
  });

  // Take the user to the login prompt
  res.redirect(`${req.baseUrl}/login`);
};

module.exports = { createGet, createPost };