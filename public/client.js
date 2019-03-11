"use strict";

var AdminClient = function AdminClient(options) {
  this.mymap = null;
  this.currentLocation = null;
  this.currentLocationMarker = null;
  this.intervalId = null;
  this.options = options; // current look up pub index

  this.nextPubIndex = 0;
};

AdminClient.prototype.setup = function () {
  var self = this;
  var mapDivId = self.options.mapDivId;
  var accessToken = self.options.accessToken; // Set up some variables to track map size for

  var bigmapheight = 600;
  var smallmapheight = 400;
  var mapbreakwidth = 600;
  var highzoom = 8;
  var lowzoom = 7;
  var initzoom; // Unpack options

  var optionLocation = self.options.location;
  var searchPubs = self.options.searchPubs;
  var pubs = self.options.pubs;
  var locationDistance = self.options.locationDistance; // Set the initial coordinates

  var initialCoordinates = [51.503605, -0.106506]; // Override the location

  if (optionLocation && optionLocation.center) {
    initialCoordinates = [optionLocation.center[1], optionLocation.center[0]];
  } // Create the mapbox view


  self.mymap = L.map(mapDivId).setView(initialCoordinates, 1); //Set initial mapheight, based on the calculated width of the map container

  if ($("#" + mapDivId).width() > mapbreakwidth) {
    initzoom = highzoom;
    $("#" + mapDivId).height(bigmapheight);
  } else {
    initzoom = lowzoom;
    $("#" + mapDivId).height(smallmapheight);
  }

  ; // Invalidate the size of the map

  self.mymap.invalidateSize(); //Use Leaflets resize event to set new map height and zoom level

  self.mymap.on('resize', function (e) {
    if (e.newSize.x < mapbreakwidth) {
      self.mymap.setZoom(lowzoom);
      $("#" + mapDivId).css('height', smallmapheight);
      self.mymap.invalidateSize();
    }

    ;

    if (e.newSize.x > mapbreakwidth) {
      self.mymap.setZoom(highzoom);
      $("#" + mapDivId).css('height', bigmapheight);
      self.mymap.invalidateSize();
    }

    ;
  }); // Set up the map

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + accessToken, {
    zoom: initzoom,
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' + '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(self.mymap); // Get the current location

  getGeoLocation(function (err, location) {
    if (err) {
      if (typeof console != 'undefined') console.log(err);
      return alert("Please Enable Location Support, and reload the page");
    } // Save the current location


    self.currentLocation = [location.latitude, location.longitude]; // Override the location

    if (optionLocation && optionLocation.center) {
      self.currentLocation = [optionLocation.center[1], optionLocation.center[0]];
    } // Center the map on the location


    self.mymap.setView(self.currentLocation, 16); // Location is defined, draw on the map

    if (optionLocation && optionLocation.center) {
      // Add starting point shape
      var layer = L.geoJSON(optionLocation.geometry);
      layer.bindTooltip(optionLocation.placeName);
      layer.addTo(self.mymap); // Create circle

      L.circle([optionLocation.center[1], optionLocation.center[0]], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: locationDistance
      }).addTo(self.mymap);
    } // Render any of search result pubs


    searchPubs.forEach(function (pub) {
      var layer = L.geoJSON(pub.geometry);
      layer.bindTooltip(pub.name);
      layer.on('click', function () {
        addPub(self.options, pub);
      });
      layer.addTo(self.mymap);
    }); // Render any pubs in the walk

    pubs.forEach(function (pub, index) {
      var markerOptions = {
        radius: 12,
        fillColor: "green",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      };
      L.geoJSON(pub.geometry, {
        pointToLayer: function pointToLayer(feature, latlng) {
          return L.circleMarker(latlng, markerOptions);
        },
        onEachFeature: function onEachFeature(feature, layer) {
          layer.bindTooltip("" + index + ". " + pub.name);
        }
      }).addTo(self.mymap);
    }); // If we have some pubs move to them

    if (searchPubs.length) {
      // Get the first element
      if (searchPubs[0].geometry.type == "Point") {
        var coordinates = [searchPubs[0].geometry.coordinates[1], searchPubs[0].geometry.coordinates[0]];
      } else {
        var coordinates = [searchPubs[0].geometry.coordinates[0][0][1], searchPubs[0].geometry.coordinates[0][0][0]];
      }

      self.mymap.flyTo(L.latLng(coordinates), self.mymap.getZoom());
    }
  });
};

function addPub(options, pub) {
  // Post the pub id
  postJSON(options.url + "/add/" + options.id, pub, {
    parseJSON: false
  }, function (err, result) {
    if (err) {
      return alert("Failed to add pub to the pub crawl");
    } // We have the list of pubs


    setDiv("pubs", result);
  });
}
"use strict";

var PubCrawlClient = function PubCrawlClient(options) {
  this.mymap = null;
  this.currentLocation = null;
  this.currentLocationMarker = null;
  this.intervalId = null;
  this.options = options; // current look up pub index

  this.nextPubIndex = 0;
};

PubCrawlClient.prototype.setup = function (callback) {
  var self = this;
  getGeoLocation(function (err, location) {
    if (err) {
      if (typeof console != 'undefined') console.log(err);
      return alert("Please Enable Location Support, and reload the page");
    } // Unpack fields


    self.pubs = self.options.pubCrawl && self.options.pubCrawl.pubs ? self.options.pubCrawl.pubs : []; // Save the current location

    self.currentLocation = [location.latitude, location.longitude]; // Create the mapbox view

    self.mymap = L.map(self.options.mapDivId).setView(self.currentLocation, 18); // Set up the map

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + self.options.accessToken, {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' + '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(self.mymap); // Create the current marker

    self.currentLocationMarker = L.marker(self.currentLocation);
    self.currentLocationMarker.addTo(self.mymap); // Render all the pub crawl pubs

    self.pubs.forEach(function (pub, index) {
      var markerOptions = {
        radius: 12,
        fillColor: "green",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      };
      L.geoJSON(pub.geometry, {
        pointToLayer: function pointToLayer(feature, latlng) {
          return L.circleMarker(latlng, markerOptions);
        },
        onEachFeature: function onEachFeature(feature, layer) {
          layer.bindTooltip("" + index + ". " + pub.name);
        }
      }).addTo(self.mymap);
    }); // Invalidate size

    self.invalidateSize(); // Update the attendant lcoation

    updateAttendantLocation(self.currentLocation); // Start current location update

    self.intervalId = setInterval(updateLocation(self), 1000);
  });
};

function updateLocation(self) {
  return function () {
    getGeoLocation(function (err, location) {
      if (err) return; // Skip everything if the location is the same

      if (location.latitude == self.currentLocation[0] && location.longitude == self.currentLocation[1]) {
        return;
      } // Save the current location


      self.currentLocation = [location.latitude, location.longitude]; // Update the current marker location

      self.currentLocationMarker.setLatLng(L.latLng(self.currentLocation)); // Update the attendant lcoation

      updateAttendantLocation(self.currentLocation);
    });
  };
}

function updateAttendantLocation(coordinates) {
  postJSON('/mobile/location', {
    latitude: coordinates[0],
    longitude: coordinates[1]
  }, {
    parseJSON: false
  }, function (err, result) {});
}

PubCrawlClient.prototype.invalidateSize = function () {
  if (this.mymap) {
    this.mymap.invalidateSize();
  }
};

PubCrawlClient.prototype.loadAttendants = function (id, callback) {
  // Unpack crawlId
  var crawlId = this.options.pubCrawl && this.options.pubCrawl._id ? this.options.pubCrawl._id : null;
  getJSON('/mobile/attendants/' + crawlId, {
    parseJSON: false
  }, function (err, result) {
    if (err) return alert(err);
    setDiv(id, result);
    if (callback) callback(err, result);
  });
};

PubCrawlClient.prototype.centerNextPub = function () {
  if (this.pubs.length) {
    // Get this or next index
    var pubIndex = this.nextPubIndex++ % this.pubs.length; // Get the next pub

    var pub = this.pubs[pubIndex]; // Center the map on the pub

    this.mymap.flyTo(extractPubPoint(pub), this.mymap.getZoom());
  }
};

function extractPubPoint(pub) {
  // Get the first element
  if (pub.geometry.type == "Point") {
    var coordinates = [pub.geometry.coordinates[1], pub.geometry.coordinates[0]];
  } else {
    var coordinates = [pub.geometry.coordinates[0][0][1], pub.geometry.coordinates[0][0][0]];
  }

  return L.latLng(coordinates);
}

PubCrawlClient.prototype.center = function () {
  if (this.currentLocation) {
    // Update the marker with the current location
    this.currentLocationMarker.setLatLng(this.currentLocation); // Center the map on the current location marker

    this.mymap.setView(this.currentLocationMarker.getLatLng(), this.mymap.getZoom());
  }
};

function mobileSetup(options) {
  getGeoLocation(function (err, location) {
    // Get any pub crawls in your area
    postJSON('/mobile', location, {
      parseJSON: false
    }, function (err, result) {
      if (err) return console.log(err);
      setDiv('crawls', result);
    });
  });
}
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Location =
/*#__PURE__*/
function () {
  function Location(doc) {
    _classCallCheck(this, Location);

    this.timestamp = doc.timestamp;
    this.latitude = doc.latitude;
    this.longitude = doc.longitude;
    this.accuracy = doc.accuracy;
    this.altitude = doc.altitude;
    this.altitudeAccuracy = doc.altitudeAccuracy;
    this.speed = doc.speed;
  }

  _createClass(Location, [{
    key: "toArray",
    value: function toArray() {
      return [this.latitude, this.longitude];
    }
  }, {
    key: "equals",
    value: function equals(obj) {
      if (obj == null) return false;
      if (obj.latitude != this.latitude) return false;
      if (obj.longitude != this.longitude) return false;
      return true;
    }
  }]);

  return Location;
}();

function getGeoLocation(callback, options) {
  options = options || {
    enableHighAccuracy: false,
    maximumAge: 1000 * 60,
    timeout: 1000 * 10
  };

  var geoSuccess = function geoSuccess(position) {
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
  };

  var geoError = function geoError(error) {
    callback(error);
  };

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError, options);
}
/**
 * Simple AJAX POST method
 */


function postJSON(url, object, options, callback) {
  if (typeof options === 'function') callback = options, options = {};
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function () {
    // Valid XML Request response
    if (xhr.status !== 200) {
      return callback('Request failed.  Returned status of ' + xhr.status);
    } // Return the result


    callback(null, options.parseJSON ? JSON.parse(xhr.responseText) : xhr.responseText);
  };

  xhr.send(JSON.stringify(object));
}
/**
 * Simple AJAX GET method
 */


function getJSON(url, options, callback) {
  if (typeof options === 'function') callback = options, options = {};
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function () {
    // Valid XML Request response
    if (xhr.status !== 200) {
      return callback('Request failed.  Returned status of ' + xhr.status);
    } // Return the result


    callback(null, options.parseJSON ? JSON.parse(xhr.responseText) : xhr.responseText);
  };

  xhr.send();
}

function setDiv(id, text) {
  document.getElementById(id).innerHTML = text;
}
//# sourceMappingURL=client.js.map
