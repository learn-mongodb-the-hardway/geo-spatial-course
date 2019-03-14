(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { setDiv, postJSON } = require('./shared');
const { Leaflet } = require('./leaflet');
const { GeoLocation } = require('./geo_location');

var AdminClient = function(options) {
  this.mymap = null;
  this.options = options;
  this.location = new GeoLocation();
}

AdminClient.prototype.setup = function() {
  var self = this;

  // Create a leaflet container
  this.leaflet = new Leaflet(
    self.options.mapDivId, self.options.accessToken);

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
    var centeringLocation = [location.latitude, location.longitude];

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

  this.location.on('error', function(err) {
    if (err) {
      if (typeof console != 'undefined') console.log(err);
      return alert("Please Enable Location Support, and reload the page");
    }
  });

  // Get current location
  this.location.location();

  // // Get the current location
  // getGeoLocation(function(err, location) {
  // });
}

function addPub(marker) {
  // Post the pub id
  postJSON(marker.url + "/add/" + marker.id, {
    _id: marker._id
  }, { parseJSON: false }, function(err, result) {
    if (err) {
      return alert("Failed to add pub to the pub crawl");
    }

    // We have the list of pubs
    setDiv("pubs", result);
  });
}

module.exports = { AdminClient, addPub }
},{"./geo_location":2,"./leaflet":4,"./shared":6}],2:[function(require,module,exports){
function notifyAll(listeners, event, obj) {
  if (listeners[event]) {
    listeners[event].forEach(function(cb) {
      cb(obj);
    });
  }
}

var GeoLocation = function(options) {  
  this.listeners = {};
  this.options = options || {};
}

GeoLocation.prototype.on = function(event, callback) {
  if (!this.listeners[event]) {
    this.listeners[event] = [];
  }

  this.listeners[event].push(callback);
}

GeoLocation.prototype.location = function() {
  var self = this;  
  // Attempt to get current location
  navigator.geolocation.getCurrentPosition(function(position) {
    notifyAll(self.listeners, 'location', position);
  }, function(error) {
    notifyAll(self.listeners, 'error', error);
  }, this.options);  
}

module.exports = { GeoLocation };
},{}],3:[function(require,module,exports){
// Import all the classes
const {AdminClient, addPub } = require('./admin_client');
const { PubCrawlClient, mobileSetup } = require('./mobile_client');

// Map the classes to the window global object
window.AdminClient = AdminClient;
window.addPub = addPub;
window.PubCrawlClient = PubCrawlClient;
window.mobileSetup = mobileSetup;
},{"./admin_client":1,"./mobile_client":5}],4:[function(require,module,exports){
var Leaflet = function(mapDivId, accessToken, options) {
  this.mapDivId = mapDivId;
  this.accessToken = accessToken;
  this.options = options || {};
}

Leaflet.prototype.init = function() {
  var self = this;
  // Unpack options
  var optionLocation = this.options.location
  var bigmapheight = this.options.bigmapheight || 600;
  var smallmapheight = this.options.smallmapheight || 400;
  var mapbreakwidth = this.options.mapbreakwidth || 600;
  var highzoom = this.options.highzoom || 8;
  var lowzoom = this.options.lowzoom || 7;

  // Set the initial coordinates
  var initialCoordinates = [51.503605, -0.106506];

  // Override the location
  if (optionLocation && optionLocation.center) {
    initialCoordinates = [optionLocation.center[1], optionLocation.center[0]];  
  }
  
  // Create the mapbox view
  this.mymap = L.map(this.mapDivId).setView(initialCoordinates, 1);

  // Map div name
  var mapDivName = "#" + this.mapDivId;

  //Set initial mapheight, based on the calculated width of the map container
  if ($(mapDivName).width() > mapbreakwidth) {
    initzoom = highzoom;
    $(mapDivName).height(bigmapheight);
  } else {
    initzoom = lowzoom;
    $(mapDivName).height(smallmapheight);
  };

  // Invalidate the size of the map
  this.mymap.invalidateSize();
  //Use Leaflets resize event to set new map height and zoom level
  this.mymap.on('resize', function(e) {
    if (e.newSize.x < mapbreakwidth) {
      self.mymap.setZoom(lowzoom);
      $(mapDivName).css('height', smallmapheight);
      self.mymap.invalidateSize();
    };
    
    if (e.newSize.x > mapbreakwidth) {
      self.mymap.setZoom(highzoom);
      $(mapDivName).css('height', bigmapheight);
      self.mymap.invalidateSize();
    };
  });

  // Set up the map
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + this.accessToken, {
    zoom: initzoom,
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(this.mymap);
}

Leaflet.prototype.center = function(latitude, longitude, zoom) {
  zoom = zoom || this.mymap.getZoom();
  this.mymap.setView([latitude, longitude], zoom);
}

Leaflet.prototype.addPointMarkerAndCircle = function(latitude, longitude, radius, tooltip) {
  // Add starting point shape
  var layer = L.geoJSON({
    type: 'Point', coordinates: [longitude, latitude]
  });

  layer.bindTooltip(tooltip);
  layer.addTo(this.mymap);

  // Create circle
  L.circle([latitude, longitude], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: radius
  }).addTo(this.mymap);
}

Leaflet.prototype.addMarkers = function(markers, callback, options) {
  var self = this;
  if (typeof options === 'function') (callback = options), (options = {});
  options = Object.assign({
    radius: 12, fillColor: "green", color: "#000",
    weight: 1, opacity: 1, fillOpacity: 0.8
  }, options || {});
  
  // Render each marker
  markers.forEach(function(marker, index) {
    var layer = L.geoJSON(marker.geometry, {
      pointToLayer: function(feature, latLng) {
        return L.circleMarker(latLng, options);
      },
      onEachFeature: function(feature, layer) {
        layer.bindTooltip("" + (index + 1) + ". " + marker.name);
      }
    }).addTo(self.mymap);

    if (typeof callback == 'function') {
      layer.on('click', callback(marker));      
    }
  });
}

Leaflet.prototype.moveToLocation = function(entries) {
  if (entries.length) {
      // Get the first element
      if (entries[0].type == "Point") {
        var coordinates = [
          entries[0].coordinates[1], 
          entries[0].coordinates[0]];  
      } else {
        var coordinates = [
          entries[0].coordinates[0][0][1], 
          entries[0].coordinates[0][0][0]];
      }

      this.mymap.flyTo(
        L.latLng(coordinates), 
        this.mymap.getZoom());
  }
}

module.exports = { Leaflet };
},{}],5:[function(require,module,exports){
const { setDiv, getJSON, postJSON, getGeoLocation } = require('./shared');

var PubCrawlClient = function(options) {
  this.mymap = null;
  this.currentLocation = null;
  this.currentLocationMarker = null;
  this.intervalId = null;
  this.options = options;
  
  // current look up pub index
  this.nextPubIndex = 0;
}

PubCrawlClient.prototype.setup = function(callback) {
  var self = this;

  getGeoLocation(function(err, location) {
    if (err) {
      if (typeof console != 'undefined') console.log(err);
      return alert("Please Enable Location Support, and reload the page");
    }

    // Unpack fields
    self.pubs = self.options.pubCrawl && self.options.pubCrawl.pubs
      ? self.options.pubCrawl.pubs
      : [];

    // Save the current location
    self.currentLocation = [location.latitude, location.longitude];
    // Create the mapbox view
    self.mymap = L.map(self.options.mapDivId).setView(self.currentLocation, 18);
    // Set up the map
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + self.options.accessToken, {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(self.mymap);

    // Create the current marker
    self.currentLocationMarker = L.marker(self.currentLocation);
    self.currentLocationMarker.addTo(self.mymap);

    // Render all the pub crawl pubs
    self.pubs.forEach(function(pub, index) {
      var markerOptions = {
        radius: 12, fillColor: "green", color: "#000",
        weight: 1, opacity: 1, fillOpacity: 0.8      
      }

      L.geoJSON(pub.geometry, {
        pointToLayer: function(feature, latlng) {
          return L.circleMarker(latlng, markerOptions);
        },
        onEachFeature: function(feature, layer) {
          layer.bindTooltip("" + index + ". " + pub.name);
        }
      }).addTo(self.mymap);
    });

    // Invalidate size
    self.invalidateSize();

    // Update the attendant lcoation
    updateAttendantLocation(self.currentLocation);

    // Start current location update
    self.intervalId = setInterval(updateLocation(self), 1000);
  });
}

function updateLocation(self) {
  return function() {
    getGeoLocation(function(err, location) {
      if (err) return;
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

PubCrawlClient.prototype.invalidateSize = function() {
  if (this.mymap) {
    this.mymap.invalidateSize();
  }
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
    // Center the map on the pub
    this.mymap.flyTo(extractPubPoint(pub), this.mymap.getZoom());
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

  return L.latLng(coordinates);
}

PubCrawlClient.prototype.center = function() {
  if (this.currentLocation) {
    // Update the marker with the current location
    this.currentLocationMarker.setLatLng(this.currentLocation);    
    // Center the map on the current location marker
    this.mymap.setView(this.currentLocationMarker.getLatLng(),this.mymap.getZoom()); 
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
},{"./shared":6}],6:[function(require,module,exports){
class Location {
  constructor(doc) {
    this.timestamp = doc.timestamp;
    this.latitude = doc.latitude;
    this.longitude = doc.longitude;
    this.accuracy = doc.accuracy;
    this.altitude = doc.altitude;
    this.altitudeAccuracy = doc.altitudeAccuracy;
    this.speed = doc.speed;
  }

  toArray() {
    return [this.latitude, this.longitude];
  }

  equals(obj) {
    if (obj == null) return false;
    if (obj.latitude != this.latitude) return false;
    if (obj.longitude != this.longitude) return false;
    return true;
  }
}

function getGeoLocation(callback, options) {
  options = options || {
    enableHighAccuracy: false,
    maximumAge: 1000 * 60,
    timeout: 1000 * 10
  };

  var geoSuccess = function(position) {
    var location = new Location({
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: position.coords.speed,
      timestamp: position.timestamp
    });

    callback(null, location);
  }

  var geoError = function(error) {
    callback(error);
  }

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError, options);
}

/**
 * Simple AJAX POST method
 */
function postJSON(url, object, options, callback) {
  if (typeof options === 'function') (callback = options), (options = {});
  
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    // Valid XML Request response
    if (xhr.status !== 200) {
      return callback('Request failed.  Returned status of ' + xhr.status);
    }

    // Return the result
    callback(null, options.parseJSON ? JSON.parse(xhr.responseText) : xhr.responseText);
  };

  xhr.send(JSON.stringify(object));
}

/**
 * Simple AJAX GET method
 */
function getJSON(url, options, callback) {
  if (typeof options === 'function') (callback = options), (options = {});
  
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    // Valid XML Request response
    if (xhr.status !== 200) {
      return callback('Request failed.  Returned status of ' + xhr.status);
    }

    // Return the result
    callback(null, options.parseJSON ? JSON.parse(xhr.responseText) : xhr.responseText);
  };

  xhr.send();
}

function setDiv(id, text) {
  document.getElementById(id).innerHTML = text;
}

module.exports = { Location, setDiv, getJSON, postJSON, getGeoLocation }
},{}]},{},[3]);
