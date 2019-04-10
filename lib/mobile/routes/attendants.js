const { ObjectId } = require('mongodb');

async function attendantsGet(req, res) {
  // Unpack variables
  const crawlId = req.params.crawlId;
  // Grab the crawl
  const doc = await req.models.crawl.findOneByIdWithAttendants(new ObjectId(crawlId));
  // No document
  const attendants = doc && doc.attendants ? doc.attendants : [];
  // Render the list of attendants
  res.render('mobile/attendants.ejs', {
    attendants: attendants
  });
};

async function attendantsLocationsGetJSON(req, res) {
  // Unpack variables
  const crawlId = req.params.crawlId;
  const userId = req.user._id;

  // Grab the crawl
  const doc = await req.models.crawl.findOneByIdAttendantLocations(new ObjectId(crawlId), userId);

  // Render the list of locations
  res.send(JSON.stringify(doc || {
    _id: crawlId,
    locations: []
  }));
}

module.exports = { attendantsGet, attendantsLocationsGetJSON };