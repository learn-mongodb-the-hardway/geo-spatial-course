const { ObjectId } = require('mongodb');

async function attendantsGet(req, res) {
  // Unpack variables
  const crawlId = req.params.crawlId;
  // Grab the crawl
  const doc = await req.models.crawl.findWithAttendants(new ObjectId(crawlId));
  // No document
  const attendants = doc && doc.attendants ? doc.attendants : [];
  // Render the list of attendants
  res.render('mobile/attendants.ejs', {
    attendants: attendants
  });
};

module.exports = { attendantsGet };