const { generateUrl } = require('../../shared');
const crypto = require('crypto');

async function createGet(req, res) {
  res.render('admin/create.ejs', { 
    url: generateUrl(req.baseUrl), errors: {}, values: {}
  });
};

async function createPost(req, res) {
  // Get collections
  const users = req.db.collection('users');

  // Unpack body
  const username = req.body.username || '';
  const password = req.body.password || '';
  const confirmPassword = req.body.confirm_password || '';

  // Check if the user exists
  var errors = {};
  if (username == '') {
    errors['username'] = 'username cannot be null or empty';
  }

  if (password == '') {
    errors['password'] = 'password cannot be null or empty';
  }

  if (confirmPassword == '') {
    errors['confirm_password'] = 'confirm_password cannot be null or empty';
  }

  if (password != confirmPassword) {
    errors['error'] = 'password and confirm password must be equal';
  }

  // Check if the user exists
  var user = await users.find({ username: username });
  if (user == null) {
    errors['error'] = `user ${username} already exists`;
  }

  // We have an error render with errors
  if (Object.keys(errors).length > 0) {
    return res.render('admin/create.ejs', { 
      url: generateUrl(req.baseUrl), errors: errors, values: req.body, options: req.options
    });
  }

  // Hash the password
  const hash = crypto.createHash('sha256');
  hash.write(password);

  // Create a user
  await users.insertOne({
    username: username,
    password: hash.digest('hex'),
    createdOn: new Date()
  });

  // Take the user to the login prompt
  res.redirect(`${req.baseUrl}/login`);
};

module.exports = { createGet, createPost };