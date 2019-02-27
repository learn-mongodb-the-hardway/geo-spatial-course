const { Crawl } = require('../../models/crawl');
const { ObjectId } = require('mongodb');

async function locationPost(req, res) {
  // Get collections
  const crawls = req.db.collection('crawls');
  const pubs = req.db.collection('pubs');
  const attendants = req.db.collection('users');
  const crawl = new Crawl(crawls);

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
  await attendants.updateOne({
    _id: user._id
  }, {
    $set: {
      location: location
    } 
  });

  // Grab the crawl
  var doc = await crawl.findById(ObjectId(crawlId));
  var pubIds = doc && doc.pubs ? doc.pubs : [];
  var docs = [];

  // No doc found
  if (!doc) {
    return res.redirect(`${req.baseUrl}?error=${encodeURIComponent(`Pub crawl with id ${crawlId} not found `)}`);
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
      pullMap[`attendants_location.${pubId}`] = user._id;
    });

    // Remove any existing pub attendances
    await crawls.updateMany({
      _id: crawlId
    }, {
      $pull: pullMap
    });
  }

  // Attendant is in a pub
  if (docs.length) {
    var setMap = {};
    // Create pub list
    docs.forEach((doc) => {
      setMap[`attendants_location.${doc._id}`] = user._id;
    });

    // Register the attendant in the specific pub
    await crawls.updateMany({
      _id: crawlId
    }, {
      $addToSet: setMap
    })
  }

  res.send({});
}

module.exports = {
  locationPost
}