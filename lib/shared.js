function generateUrl(baseUrl) {
  return (url) => {
    return `${baseUrl}/${url}`;
  }
}

module.exports = {
  generateUrl
}