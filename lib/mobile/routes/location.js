const { Crawl } = require('../../models/crawl');

async function locationPost(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');
  const pubs = req.db.collection('pubs');
  const attendants = req.db.collection('attendants');
  const crawl = new Crawl(crawls);

  // Check if have an active session and longitude/latitude
  if (req.session.loggedIn == null
      || req.body.longitude == null
      || req.body.latitude == null) {
    return res.send({}); 
  }

  // Create location point
  const location = {
    type: 'Point', coordinates: [req.body.longitude, req.body.latitude]  
  }

  // Update the attendants location
  await attendants.updateOne({
    _id: req.session.userId
  }, {
    $set: {
      location: location
    } 
  });

  // Grab the crawl
  var doc = await crawl.findById(req.session.crawlId);
  var pubIds = doc && doc.pubs ? doc.pubs : [];
  var docs = [];

  // No doc found
  if (!doc) {
    return res.redirect(`${req.baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${req.params.crawlId} not found `)}`);
  }
  
  // Check if we are inside a pub and mark the crawl with people in the pub
  if (pubIds.length) {
    docs = await pubs.find({
      _id: { $in: pubIds },
      geometry: {
        $nearSphere: {
          $geometry: location,
          $maxDistance: 15
        }
      } 
    }).toArray();  
  }

  // If we have any pub ids we need to clear out any attendance
  if (pubIds.length) {
    // Clear out any attendance
    var pullMap = {};
    // Create pub list
    pubIds.forEach((pubId) => {
      pullMap[`attendants_location.${pubId}`] = req.session.userId;
    });

    // Remove any existing pub attendances
    await crawls.updateMany({
      _id: req.session.crawlId
    }, {
      $pull: pullMap
    });
  }

  // Attendant is in a pub
  if (docs.length) {
    var setMap = {};
    // Create pub list
    docs.forEach((doc) => {
      setMap[`attendants_location.${doc._id}`] = req.session.userId;
    });

    // Register the attendant in the specific pub
    await crawls.updateMany({
      _id: req.session.crawlId
    }, {
      $addToSet: setMap
    })
  }

  res.send({});
}

module.exports = {
  locationPost
}