const { Crawl } = require('../../models/crawl');

async function leaveGet(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');

  // create instanced
  const crawl = new Crawl(crawls);

  // Remove the user from any crawl pub attendence
  const doc = await crawl.findById(req.session.crawlId);

  // No pub crawl
  if (doc == null) {
    // Set the session crawl Id to undefined
    req.session.crawlId = undefined;
    // Redirect to the main page for mobile
    return res.redirect(req.baseUrl);
  }

  // Build the update to remove the person from any pub in attendance
  const pubIds = doc.pubs || [];
  
  // Build update clause
  const updateClause = { $pull: [] };

  // Pull attendance from any pubs we are checked into
  if (pubIds.length) {
    const removeAttendantMap = {};

    pubIds.forEach(pubId => {
      removeAttendantMap[`attendants_location.${pubId}`] = req.session.userId;
    });  

    updateClause['$pull'] = removeAttendantMap;
  }

  // Pull the user from the attendance array
  updateClause['$pull'].attendants = req.session.userId;

  // Finish up the crawl
  await crawls.updateOne({
    _id: req.session.crawlId
  }, updateClause);    

  // Set the session crawl Id to undefined
  req.session.crawlId = undefined;

  // Redirect to the main page for mobile
  res.redirect(req.baseUrl);
}

module.exports = {
  leaveGet
}