const { BrowserInteractions } = require('./shared');

var AdminClient = function(leaflet, location, options) {
  this.mymap = null;
  this.options = options;
  this.leaflet = leaflet;
  this.location = location;
}

AdminClient.prototype.setup = function() {
  var self = this;

  // Initialize
  this.leaflet.init();

  // Unpack options
  var optionLocation = self.options.location
  var searchPubs = self.options.searchPubs;
  var pubs = self.options.pubs;
  var locationDistance = self.options.locationDistance;
  
  // Get the current location
  this.location.on('location', function(location) {
    // Centering location
    var centeringLocation = [location.coords.latitude, location.coords.longitude];

    // Location is defined, draw on the map
    if (optionLocation && optionLocation.center) {
      // GeoJSON stores in order [longitude, latitude]
      self.leaflet.addPointMarkerAndCircle(
        optionLocation.center[1],
        optionLocation.center[0], 
        locationDistance,
        optionLocation.placeName
      )

      // GeoJSON stores in order [longitude, latitude]
      centeringLocation = [optionLocation.center[1], optionLocation.center[0]];
    }

    // Center the map
    self.leaflet.center(centeringLocation[0], centeringLocation[1], 16);

    // Map the search markers
    // Add the markers to the leaflet
    self.leaflet.addMarkers(searchPubs.map(function(pub) {
      return {
        url: self.options.url,
        id: self.options.id,
        name: pub.name,
        _id: pub._id,
        geometry: pub.geometry
      }
    }), function(marker) {
      return function() {
        addPub(marker);
      }
    });

    // Map the crawl pubs
    // Add the markers to the leaflet
    self.leaflet.addMarkers(pubs.map(function(pub) {
      return {
        name: pub.name,
        geometry: pub.geometry
      }
    }));

    // If we have some pubs move to them
    if (searchPubs.length) {
      self.leaflet.moveToLocation(searchPubs.map(function(pub) {
        return pub.geometry;
      }));
    }
  });

  // Handle any error
  this.location.on('error', function(err) {
    if (err) {
      if (typeof console != 'undefined') console.log(err);
      return alert("Please Enable Location Support, and reload the page");
    }
  });

  // Get current location
  this.location.location();
}

function addPub(marker, browser) {
  browser = browser || new BrowserInteractions();
  // Post the pub id
  browser.postJSON(marker.url + "/add/" + marker.id, {
    _id: marker._id
  }, { parseJSON: false }, function(err, result) {
    if (err) {
      return alert("Failed to add pub to the pub crawl");
    }

    // We have the list of pubs
    browser.setDiv("pubs", result);
  });
}

module.exports = { AdminClient, addPub }