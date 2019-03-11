const circleToPolygon = require('circle-to-polygon');
const { MapBoxServices } = require('../../../mapbox');
const { generateUrl, address } = require('../../../shared');
const { ObjectId } = require('mongodb');
const moment = require('moment');

async function locationSetGet(req, res) {
  // Unpack variables
  const crawlId = req.params.crawlId;
  const addressId = req.params.addressId;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const options = req.options;
  const distance = req.body.distance || 1000;

  // Fetch the crawl
  var doc = await req.models.crawl.findOneById(new ObjectId(crawlId));
  // We could not find the 
  if (!doc) {
    return res.redirect(`/error?error=${encodeURIComponent(`could not locate pub crawl with id ${crawlId}`)}`)
  }

  // Locate the result in the search locations
  const locations = doc['searchLocations'] ? doc.searchLocations.filter(location => {
    return location.id == addressId;
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
    await req.models.crawl.updateLocation(new ObjectId(crawlId), location);
  }

  // Get the crawl
  var doc = await req.models.crawl.findOneByIdFull(new ObjectId(crawlId));
  // Render the edit pub crawl view
  res.render('admin/crawls/create.ejs', { 
    user: user, 
    options: options,
    url: generateUrl(baseUrl), 
    crawl: doc,
    locations: [],
    distance: distance,
    address: address,
    moment: moment,
    errors: {},
    pubs: [] 
  });
};

async function locationFindPost(req, res) {
  // Unpack body
  const addressString = req.body.address;
  const accessToken = req.options.accessToken;
  const crawlId = req.params.crawlId;
  const distance = req.body.distance || 1000;
  const baseUrl = req.baseUrl;
  const user = req.user;
  const options = req.options;

  // Create a mapbox service
  const service = new MapBoxServices(accessToken);
  
  // No address provided
  if (!addressString) {
    return res.redirect(`/error?error=${encodeURIComponent(`address parameter must be passed`)}`)
  }
  
  // Geo-code the address
  const locations = await service.geoCode(addressString);

  // Store the results on the crawl to avoid unnecessary geo encoding
  await req.models.crawl.updateSearchLocations(new ObjectId(crawlId), locations, distance);

  // Get the crawl
  var doc = await req.models.crawl.findOneByIdFull(new ObjectId(crawlId));

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
    errors: {},
    pubs: [] 
  });      
};

module.exports = { locationSetGet, locationFindPost };
