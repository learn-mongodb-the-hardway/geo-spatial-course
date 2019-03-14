const { setDiv, getJSON, postJSON } = require('./shared');
const { GeoLocation } = require('./geo_location');

var PubCrawlClient = function(options) {
  this.mymap = null;
  this.currentLocation = null;
  this.currentLocationMarker = null;
  this.intervalId = null;
  this.options = options;

  // Geo location object
  this.locationFactory = GeoLocation;
  
  // current look up pub index
  this.nextPubIndex = 0;
}

PubCrawlClient.prototype.setup = function(callback) {
  var self = this;

  // Create a leaflet container
  this.leaflet = new Leaflet(
    self.options.mapDivId, self.options.accessToken);

  // Initialize
  this.leaflet.init();

  // Geo Call
  var location = new this.locationFactory();

  // Get the current location
  location.on('location', function(location) {
    // Unpack fields
    self.pubs = self.options.pubCrawl && self.options.pubCrawl.pubs
      ? self.options.pubCrawl.pubs
      : [];

    // Save the current location
    self.currentLocation = [location.latitude, location.longitude];

    // Map the crawl pubs
    // Add the markers to the leaflet
    self.leaflet.addMarkers(self.pubs.map(function(pub) {
      return {
        name: pub.name,
        geometry: pub.geometry
      }
    }));

    // Invalidate size
    self.leaflet.invalidateSize();

    // Update the attendant location
    updateAttendantLocation(self.currentLocation);

    // Start current location update
    self.intervalId = setInterval(updateLocation(self), 1000);
  });

  // Handle any error
  location.on('error', function(err) {
    if (err) {
      if (typeof console != 'undefined') console.log(err);
      return alert("Please Enable Location Support, and reload the page");
    }
  });
}

function updateLocation(self) {
  return function() {
    // Geo Call
    var location = new this.locationFactory();

    // Get the current location
    location.on('location', function(location) {
      // Skip everything if the location is the same
      if (location.latitude == self.currentLocation[0]
        && location.longitude == self.currentLocation[1]) {
          return;
      }

      // Save the current location
      self.currentLocation = [location.latitude, location.longitude];
      // Update the current marker location
      self.currentLocationMarker.setLatLng(L.latLng(self.currentLocation));
      // Update the attendant lcoation
      updateAttendantLocation(self.currentLocation);
    });
  }
}

function updateAttendantLocation(coordinates) {
  postJSON('/mobile/location', {
    latitude: coordinates[0],
    longitude: coordinates[1]
  }, { parseJSON: false }, function(err, result) {});
}

PubCrawlClient.prototype.loadAttendants = function(id, callback) {
  // Unpack crawlId
  var crawlId = this.options.pubCrawl && this.options.pubCrawl._id
    ? this.options.pubCrawl._id
    : null;

  getJSON('/mobile/attendants/' + crawlId, 
    { parseJSON: false}, function(err, result) {
      if (err) return alert(err);
      setDiv(id, result);

      if (callback) callback(err, result);
    });
}

PubCrawlClient.prototype.centerNextPub = function() {
  if (this.pubs.length) {
    // Get this or next index
    var pubIndex = this.nextPubIndex++ % this.pubs.length;
    
    // Get the next pub
    var pub = this.pubs[pubIndex];

    // Get the coordinates
    var coords = extractPubPoint(pub);

    // // Center the map on the pub
    this.leaflet.center(coords[0], coords[1, this.leaflet.getZoom()]);
  }    
}

function extractPubPoint(pub) {
  // Get the first element
  if (pub.geometry.type == "Point") {
    var coordinates = [
      pub.geometry.coordinates[1], 
      pub.geometry.coordinates[0]];  
  } else {
    var coordinates = [
      pub.geometry.coordinates[0][0][1], 
      pub.geometry.coordinates[0][0][0]];
  }

  return coordinates;
}

PubCrawlClient.prototype.center = function() {
  if (this.currentLocation) {
    // Update the market
    this.leaflet.setCurrentLocationMarker(this.currentLocation[0], this.currentLocation[1]);
    // Center the map
    this.leaflet.center(this.currentLocation[0], this.currentLocation[1]);
  }
}

function mobileSetup(options) {
  getGeoLocation((err, location) => {
    // Get any pub crawls in your area
    postJSON('/mobile', location, { parseJSON: false }, function(err, result) {
      if (err) return console.log(err);
      setDiv('crawls', result);

      // Refresh view
      setTimeout(function() {
        mobileSetup(options);
      }, 3000);
    });
  });
}

module.exports = { PubCrawlClient, mobileSetup }