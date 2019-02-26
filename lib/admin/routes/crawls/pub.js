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
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack values
  const crawlId = req.params.crawlId;
  const pubId = req.params.pubId;
  const user = req.user;
  const options = req.options;
  const baseUrl = req.baseUrl;

  // Update the doc
  var result = await crawl.removePub(new ObjectId(crawlId), new ObjectId(pubId));

  // Get the crawl
  var doc = await crawl.findFull(new ObjectId(crawlId));

  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${req.params.crawlId}`)}`)
  }

  // Render the edit pub crawl view
  res.render('admin/crawls/create.ejs', { 
    user: user, 
    options: options,
    url: generateUrl(baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    pubs: [] 
  });
}

async function pubMoveupGet(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack values
  const crawlId = req.params.crawlId;
  const pubId = req.params.pubId;
  const user = req.user;
  const options = req.options;
  const baseUrl = req.baseUrl;

  // Update the doc
  var result = await crawl.movePubUp(new ObjectId(crawlId), new ObjectId(pubId));

  // Get the crawl
  var doc = await crawl.findFull(new ObjectId(crawlId));

  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${req.params.crawlId}`)}`)
  }

  // Render the edit pub crawl view
  res.render('admin/crawls/create.ejs', { 
    user: user, 
    options: options,
    url: generateUrl(baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    pubs: [] 
  });
}

async function pubFindPost(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const pubs = req.db.collection('pubs');
  const postcodes = req.db.collection('postcodes');
  const crawl = new Crawl(crawls);

  // Unpack values
  const crawlId = req.params.crawlId;
  const user = req.user;
  const options = req.options;
  const baseUrl = req.baseUrl;
  const addressLocation = req.body.address;
  const distance = req.body.distance || 1000;
  const accessToken = options.accessToken;
  const postcode = req.body.postcode;

  // Fetch the associated pub crawl
  var doc = await crawl.findFull(new ObjectId(crawlId));
  var pubDocs = [];

  // If we have an address locate the center of the point
  if (addressLocation) {
    // Create a mapbox service
    const service = new MapBoxServices(accessToken);
    // Geocode the address
    const locations = await service.geoCode(addressLocation);
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
  } else if (postcode) {
    // If we have a post code search for possible entries
    var postCode = await postcodes.findOne({ name: postcode });
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
  res.render('admin/crawls/create.ejs', { 
    user: user, 
    options: options,
    url: generateUrl(baseUrl), 
    crawl: doc,
    address: address,
    moment: moment,
    pubs: pubDocs 
  });
}

module.exports = {
  pubAddPost, pubDeleteGet, pubFindPost, pubMoveupGet
}