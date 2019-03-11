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

function isValidDate(date) {
  return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date);
}

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

async function executeAndSkipException(func) {
  try {
    await func();
  } catch (err) {}
}

function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.write(password);
  return hash.digest('hex');
}

module.exports = {
  generateUrl, address, ensureLoggedIn, 
  hashPassword, executeAndSkipException,
  isValidDate, isString
}