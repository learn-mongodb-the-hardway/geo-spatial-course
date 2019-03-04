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
    });
  });
}