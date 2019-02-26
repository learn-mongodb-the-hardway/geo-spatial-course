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

module.exports = {
  generateUrl, address
}