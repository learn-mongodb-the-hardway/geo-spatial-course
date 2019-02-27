const { Crawl } = require('../../models/crawl');

async function leaveGet(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack variables
  const crawlId = req.session.crawlId;
  const baseUrl = req.baseUrl;
  const session = req.session;

  // Remove the user from any crawl pub attendence
  const doc = await crawl.findById(crawlId);

  // No pub crawl
  if (doc == null) {
    // Set the session crawl Id to undefined
    session.crawlId = undefined;
    // Log out
    req.logout();
    // Redirect to the main page for mobile
    return res.redirect(baseUrl);
  }

  // Build the update to remove the person from any pub in attendance
  const pubIds = doc.pubs || [];
  
  // Build update clause
  const updateClause = { $pull: [] };

  // Pull attendance from any pubs we are checked into
  if (pubIds.length) {
    const removeAttendantMap = {};

    pubIds.forEach(pubId => {
      removeAttendantMap[`attendants_location.${pubId}`] = session.userId;
    });  

    updateClause['$pull'] = removeAttendantMap;
  }

  // Pull the user from the attendance array
  updateClause['$pull'].attendants = session.userId;

  // Finish up the crawl
  await crawls.updateOne({
    _id: session.crawlId
  }, updateClause);    

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