const { MapBoxServices } = require('../../../mapbox');
const { generateUrl, address } = require('../../../shared');
const { Crawl } = require('../../../models/crawl');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function pubAddPost(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack values
  const crawlId = req.params.crawlId;
  const pubId = req.body._id;
  const baseUrl = req.baseUrl;

  // Add the pub to the list
  await crawls.updateOne({
    _id: new ObjectId(crawlId)
  }, {
    $push: { pubs: new ObjectId(pubId) }
  });

  // Get the crawl
  var doc = await crawl.findFull(new ObjectId(crawlId));

  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${req.params.crawlId}`)}`)
  }
  
  // Render the pub list
  res.render('partials/admin/crawls/pub_list.ejs', {
     user: req.user, url: generateUrl(baseUrl), crawl: doc, address: address 
  });
}

async function pubDeleteGet(req, res) {
  // Update the doc
  var result = await crawl.removePub(new ObjectId(req.params.crawlId), new ObjectId(req.params.pubId));

  // Get the crawl
  var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

  // Render the edit pub crawl view
  res.render('admin/crawls/create', { 
    user: req.user, 
    options: options,
    url: generateUrl(req.baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    pubs: [] 
  });
}

async function pubMoveupGet(req, res) {
  // Update the doc
  var result = await crawl.movePubUp(new ObjectId(req.params.crawlId), new ObjectId(req.params.pubId));

  // Get the crawl
  var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

  // Render the edit pub crawl view
  res.render('admin/crawls/create', { 
    user: req.user, 
    options: options,
    url: generateUrl(req.baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    pubs: [] 
  });
}

async function pubFindPost(req, res) {
  // Fetch the associated pub crawl
  var doc = await crawl.findFull(new ObjectId(req.params.crawlId));

  var pubDocs = [];

  // If we have an address locate the center of the point
  if (req.body.address) {
    var distance = req.body.distance || 1000;
    // Create a mapbox service
    const service = new MapBoxServices(options.accessToken);
    // Geocode the address
    const locations = await service.geoCode(req.body.address);
    // Get the first location if any
    if (locations.length) {
      // Get the center point (lets us ignore that the returned feature is a polygon)
      var center = locations[0].center;
      // Locate all the entries near the center point
      pubDocs = await pubs.find({
        geometry: {
          $nearSphere: {
            $geometry: {
              type: "Point",
              coordinates: center
            },
            $maxDistance: parseInt(distance)
          }
        }
      }).toArray();
    }
  } else if (req.body.postcode) {
    // If we have a post code search for possible entries
    var postCode = await postcodes.findOne({ name: req.body.postcode });
    // Locate by post code
    if (postCode != null) {
      // Search for pubs based on post code
      pubDocs = await pubs.find({
        geometry: {
          $geoWithin: {
            $geometry: postCode.geometry
          }
        }
      }).toArray();
    }
  }

  // Render the edit pub crawl view
  res.render('admin/crawls/create', { 
    user: req.user, 
    options: options,
    url: generateUrl(req.baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    pubs: pubDocs 
  });
}

module.exports = {
  pubAddPost, pubDeleteGet, pubFindPost, pubMoveupGet
}