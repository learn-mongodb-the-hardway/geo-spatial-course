async function leaveGet(req, res) {
  // Unpack variables
  const crawlId = req.session.crawlId;
  const user = req.user;
  const baseUrl = req.baseUrl;
  const session = req.session;

  // Remove the user from any crawl pub attendence
  const doc = await req.models.crawl.findOneById(crawlId);

  // No pub crawl
  if (doc == null) {
    // Set the session crawl Id to undefined
    session.crawlId = undefined;
    // Log out
    req.logout();
    // Redirect to the main page for mobile
    return res.redirect(baseUrl);
  }

  // Remove the user from the crawl
  await req.models.crawl.removeUserFromPubs(crawlId, user._id);

  // Remove the user from the attendants list
  await req.models.crawl.removeAttendant(crawlId, user._id);

  // Set the session crawl Id to undefined
  session.crawlId = undefined;

  // Logout
  req.logout();

  // Redirect to the main page for mobile
  res.redirect(baseUrl);
}

module.exports = {
  leaveGet
}