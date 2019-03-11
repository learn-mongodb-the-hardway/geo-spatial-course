const { ObjectId } = require('mongodb');

async function locationPost(req, res) {
  // Unpack variables
  const user = req.user;
  const longitude = req.body.longitude;
  const latitude = req.body.latitude;
  const crawlId = req.session.crawlId;

  // Check if have an active session and longitude/latitude
  if (user == null
      || longitude == null
      || latitude == null) {
    return res.send({}); 
  }

  // Create location point
  const location = {
    type: 'Point', coordinates: [longitude, latitude]  
  }

  // Update the attendants location
  await req.models.user.updateLocation(user._id, location);

  // Grab the crawl
  var doc = await req.models.crawl.findOneById(ObjectId(crawlId));
  var pubIds = doc && doc.pubs ? doc.pubs : [];
  var docs = [];

  // No doc found
  if (!doc) {
    return res.redirect(`${req.baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${crawlId} not found `)}`);
  }
  
  // Check if we are inside a pub and mark the crawl with people in the pub
  if (pubIds.length) {
    docs = await req.models.pub.findByNearSphere([longitude, latitude], 15, pubIds);
  }

  // If we have any pub ids we need to clear out any attendance
  if (pubIds.length) {
    await req.models.crawl.removeUserFromPubs(crawlId, user._id);
  }

  // Attendant is in a pub
  if (docs.length) {
    await req.models.crawl.addUserToPubs(crawlId, user._id, docs.map(d => d._id));
  }

  res.send({});
}

module.exports = {
  locationPost
}