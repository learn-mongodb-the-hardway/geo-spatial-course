const { generateUrl } = require('../../shared');

async function logoutGet(req, res) {
  req.logout();
  res.redirect(`/`);
};

module.exports = { logoutGet };