const { setDiv, postJSON, getGeoLocation } = require('./shared');

var AdminClient = function(options) {
  this.mymap = null;
  this.currentLocation = null;
  this.currentLocationMarker = null;
  this.intervalId = null;
  this.options = options;
  
  // current look up pub index
  this.nextPubIndex = 0;
}

AdminClient.prototype.setup = function() {
  var self = this;
  var mapDivId = self.options.mapDivId;
  var accessToken = self.options.accessToken;

  // Set up some variables to track map size for
  var bigmapheight = 600;
  var smallmapheight = 400;
  var mapbreakwidth = 600;
  var highzoom = 8;
  var lowzoom = 7;
  var initzoom;

  // Unpack options
  var optionLocation = self.options.location
  var searchPubs = self.options.searchPubs;
  var pubs = self.options.pubs;
  var locationDistance = self.options.locationDistance;
  
  // Set the initial coordinates
  var initialCoordinates = [51.503605, -0.106506];

  // Override the location
  if (optionLocation && optionLocation.center) {
    initialCoordinates = [optionLocation.center[1], optionLocation.center[0]];  
  }

  // Create the mapbox view
  self.mymap = L.map(mapDivId).setView(initialCoordinates, 1);

  //Set initial mapheight, based on the calculated width of the map container
  if ($("#" + mapDivId).width() > mapbreakwidth) {
    initzoom = highzoom;
    $("#" + mapDivId).height(bigmapheight);
  } else {
    initzoom = lowzoom;
    $("#" + mapDivId).height(smallmapheight);
  };

  // Invalidate the size of the map
  self.mymap.invalidateSize();
  //Use Leaflets resize event to set new map height and zoom level
  self.mymap.on('resize', function(e) {
    if (e.newSize.x < mapbreakwidth) {
      self.mymap.setZoom(lowzoom);
      $("#" + mapDivId).css('height', smallmapheight);
      self.mymap.invalidateSize();
    };
    
    if (e.newSize.x > mapbreakwidth) {
      self.mymap.setZoom(highzoom);
      $("#" + mapDivId).css('height', bigmapheight);
      self.mymap.invalidateSize();
    };
  });

  // Set up the map
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + accessToken, {
    zoom: initzoom,
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(self.mymap);

  // Get the current location
  getGeoLocation(function(err, location) {
    if (err) {
      if (typeof console != 'undefined') console.log(err);
      return alert("Please Enable Location Support, and reload the page");
    }

    // Save the current location
    self.currentLocation = [location.latitude, location.longitude];

    // Override the location
    if (optionLocation && optionLocation.center) {
      self.currentLocation = [optionLocation.center[1], optionLocation.center[0]];  
    }

    // Center the map on the location
    self.mymap.setView(self.currentLocation, 16)

    // Location is defined, draw on the map
    if (optionLocation && optionLocation.center) {
      // Add starting point shape
      var layer = L.geoJSON(optionLocation.geometry);
      layer.bindTooltip(optionLocation.placeName);
      layer.addTo(self.mymap);

      // Create circle
      L.circle([optionLocation.center[1], optionLocation.center[0]], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: locationDistance
      }).addTo(self.mymap);
    }

    // Render any of search result pubs
    searchPubs.forEach(function(pub) {
      var layer = L.geoJSON(pub.geometry)
      layer.bindTooltip(pub.name);
      layer.on('click', function() { 
        addPub(self.options, pub);
      });

      layer.addTo(self.mymap);
    });

    // Render any pubs in the walk
    pubs.forEach(function(pub, index) {
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
   
    // If we have some pubs move to them
    if (searchPubs.length) {
      // Get the first element
      if (searchPubs[0].geometry.type == "Point") {
        var coordinates = [
          searchPubs[0].geometry.coordinates[1], 
          searchPubs[0].geometry.coordinates[0]];  
      } else {
        var coordinates = [
          searchPubs[0].geometry.coordinates[0][0][1], 
          searchPubs[0].geometry.coordinates[0][0][0]];
      }

      self.mymap.flyTo(
        L.latLng(coordinates), 
        self.mymap.getZoom());
    }
  });
}

function addPub(options, pub) {
  // Post the pub id
  postJSON(options.url + "/add/" + options.id, pub, { parseJSON: false }, function(err, result) {
    if (err) {
      return alert("Failed to add pub to the pub crawl");
    }

    // We have the list of pubs
    setDiv("pubs", result);
  });
}

module.exports = { AdminClient, addPub }