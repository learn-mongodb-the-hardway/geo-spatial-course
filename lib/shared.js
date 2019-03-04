const crypto = require('crypto');

function generateUrl(baseUrl) {
  return (url) => {
    return `${baseUrl}/${url}`;
  }
}

function address(pub) {
  var parts = [];

  if (pub.street) parts.push(pub.street);
  if (pub.housenumber) parts.push(pub.housenumber);
  if (pub.city) parts.push(pub.city);
  if (pub.postcode) parts.push(pub.postcode);
  return parts.join(",");
}

function ensureLoggedIn(role, redirectTo) {
  return function(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect(redirectTo);
    }

    next();
  }
}

function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.write(password);
  return hash.digest('hex');
}

module.exports = {
  generateUrl, address, ensureLoggedIn, hashPassword
}