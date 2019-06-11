const { BrowserInteractions } = require('./shared');
const { GeoLocation } = require('./geo_location');

var PubCrawlClient = function(
  leaflet, 
  locationFactory, 
  browserInteractions,
  options
) {
  this.currentLocation = null;
  this.intervalId = null;
  this.options = options || {};

  // Geo location object
  this.leaflet = leaflet;
  this.locationFactory = locationFactory;
  
  // current look up pub index
  this.nextPubIndex = 0;

  // Set the browser interaction handler
  this.browserInteractions = browserInteractions;
}

PubCrawlClient.prototype.setup = function() {
  var self = this;

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
    self.currentLocation = [location.coords.latitude, location.coords.longitude];

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

    // Set the current marker position
    self.leaflet.setCurrentLocationMarker(self.currentLocation[0], self.currentLocation[1]);

    // Center the current location
    self.leaflet.center(self.currentLocation[0], self.currentLocation[1]);

    // Update the attendant location
    updateAttendantLocation(self, self.currentLocation);

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

  // Trigger location lookup
  location.location();
}

function updateLocation(self) {
  return function() {
    // Geo Call
    var location = new self.locationFactory();

    // Get the current location
    location.on('location', function(location) {
      // Skip everything if the location is the same
      if (location.latitude == self.currentLocation[0]
        && location.longitude == self.currentLocation[1]) {
          return;
      }

      // Save the current location
      self.currentLocation = [location.coords.latitude, location.coords.longitude];
      // Update the current marker location
      self.leaflet.setCurrentLocationMarker(self.currentLocation[0], self.currentLocation[1]);
      // Update the users location
      updateAttendantLocation(self, self.currentLocation);
      // Update the locations of the attendants
      self.loadAttendantsLocations();
    });

    // Trigger location lookup
    location.location();
  }
}

function updateAttendantLocation(self, coordinates) {
  self.browserInteractions.postJSON('/mobile/location', {
    latitude: coordinates[0],
    longitude: coordinates[1]
  }, { parseJSON: false }, function(err, result) {});
}

PubCrawlClient.prototype.loadAttendants = function(id, callback) {
  var self = this;
  // Unpack crawlId
  var crawlId = this.options.pubCrawl && this.options.pubCrawl._id
    ? this.options.pubCrawl._id
    : null;

  this.browserInteractions.getJSON('/mobile/attendants/' + crawlId, 
    { parseJSON: false}, function(err, result) {
      if (err && typeof console != 'undefined') return console.log(err);

      self.browserInteractions.setDiv(id, result);

      if (callback) callback(err, result);
    });
}

 PubCrawlClient.prototype.loadAttendantsLocations = function(callback) {
  var self = this;
  // Unpack crawlId
  var crawlId = this.options.pubCrawl && this.options.pubCrawl._id
    ? this.options.pubCrawl._id
    : null;

  this.browserInteractions.getJSON('/mobile/locations/' + crawlId, 
    { parseJSON: true}, function(err, result) {
      if (err && callback) return callback(err);
      if (err && typeof console != 'undefined') return console.log(err);

      // We are going to update user locations on the map
      self.leaflet.setLocations(result.locations, {
        id: '_id',
        label: 'name',
        geometry: 'location'
      });

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
    this.leaflet.centerFlyTo(coords[0], coords[1], this.leaflet.getZoom());
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

function mobileSetup(options, browser, location) {
  browser = browser || new BrowserInteractions();
  // Set a new geo location instance
  var location = location || new GeoLocation();
  // Wait for the location
  location.on('location', function(location) {
    // Get any pub crawls in your area
    browser.postJSON('/mobile', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp
    }, { parseJSON: false }, function(err, result) {
      if (err && typeof console != 'undefined') return console.log(err);
      browser.setDiv('crawls', result);

      // Refresh view
      browser.setTimeout(function() {
        mobileSetup(options);
      }, 3000);
    });
  });

  // Trigger get location
  location.location();
}

module.exports = { PubCrawlClient, mobileSetup }