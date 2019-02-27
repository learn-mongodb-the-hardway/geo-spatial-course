const { generateUrl } = require('../../shared');
const { User } = require('../../models/user');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

async function createGet(req, res) {
  res.render('admin/create.ejs', { 
    url: generateUrl(req.baseUrl), errors: {}, values: {}
  });
};

async function createPost(req, res) {
  // Get collections
  const users = req.db.collection('users');
  const user = new User(req.db.collection('users'))

  // Unpack body
  const username = req.body.username || '';
  const password = req.body.password || '';
  const confirmPassword = req.body.confirm_password || '';

  // Attempt to create the user
  const errors = await user.create(ObjectId(), username, password, confirmPassword)

  // We have an error render with errors
  if (Object.keys(errors).length > 0) {
    return res.render('admin/create.ejs', { 
      url: generateUrl(req.baseUrl), errors: errors, values: req.body, options: req.options
    });
  }

  // Take the user to the login prompt
  res.redirect(`${req.baseUrl}/login`);
};

module.exports = { createGet, createPost };