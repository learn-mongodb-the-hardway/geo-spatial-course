const circleToPolygon = require('circle-to-polygon');
const { MapBoxServices } = require('../../../mapbox');
const { generateUrl, address } = require('../../../shared');
const { Crawl } = require('../../../models/crawl');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function locationSetGet(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Fetch the crawl
  var doc = await crawl.findById(new ObjectId(req.params.crawlId));
  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${req.params.crawlId}`)}`)
  }

  // Locate the result in the search locations
  const locations = doc['searchLocations'] ? doc.searchLocations.filter(location => {
    return location.id == req.params.addressId;
  }) : [];

  // We have a location set the current location on the document
  if (locations.length) {
    // Get the location
    var location = locations[0];
    // Convert the geometry center to a circle
    let polygon = circleToPolygon(location.center, doc.locationDistance || 1000, 32)

    // Add polygon to the document
    location.polygon = polygon;

    // Update the crawl with the location
    var results = await crawls.updateOne({
      _id: new ObjectId(req.params.crawlId)
    }, {
      $set: {
        location: location
      },
      $unset: {
        searchLocations: true
      }
    });
  }

  // Get the crawl
  var doc = await crawl.findFull(new ObjectId(req.params.crawlId));
  // Render the edit pub crawl view
  res.render('admin/crawls/create.ejs', { 
    user: req.user, 
    options: req.options,
    url: generateUrl(req.baseUrl), 
    crawl: doc,
    locations: locations,
    distance: req.body.distance || 1000,
    address: address,
    moment: moment,
    pubs: [] 
  });
};

async function locationFindPost(req, res) {
  // Get the user collection
  const crawls = req.db.collection('crawls');
  const crawl = new Crawl(crawls);

  // Unpack body
  const address = req.body.address;
  const accessToken = req.options.accessToken;
  const crawlId = req.params.crawlId;
  const distance = req.body.distance || 1000;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const options = req.options;

  // Create a mapbox service
  const service = new MapBoxServices(accessToken);
  
  // No address provided
  if (!address) {
    return res.redirect(`/error?error=${encodeURIComponent(`address parameter must be passed`)}`)
  }
  
  // Geo-code the address
  const locations = await service.geoCode(address);

  // Store the results on the crawl to avoid unnecessary geo encoding
  var result = await crawls.updateOne({
    _id: new ObjectId(crawlId)
  }, {
    $set: {
      searchLocations: locations,
      locationDistance: distance || 1000
    }
  });

  // We could not find the 
  if (result.modifiedCount == 0) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${crawlId}`)}`)
  }

  // Get the crawl
  var doc = await crawl.findFull(new ObjectId(crawlId));

  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${crawlId}`)}`)
  }
  
  // Render the edit pub crawl view
  res.render('admin/crawls/create.ejs', { 
    user: user, 
    options: options,
    url: generateUrl(baseUrl), 
    crawl: doc,
    locations: locations,
    distance: distance,
    address: address,
    moment: moment,
    pubs: [] 
  });      
};

module.exports = { locationSetGet, locationFindPost };
