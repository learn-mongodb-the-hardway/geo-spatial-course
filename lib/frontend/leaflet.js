var Leaflet = function(mapDivId, accessToken, options) {
  this.mapDivId = mapDivId;
  this.accessToken = accessToken;
  this.options = options || {};
  this.attendants = {};

  // Current location
  this.currentLocation = null;
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

  // Invalidate the size of the map
  this.invalidateSize();

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

Leaflet.prototype.setLocations = function(locations, options) {
  var self = this;
  // Safeguard the parameters
  locations = locations || [];
  options = options || {};

  // Unpack the options
  var id = options.id || '_id';
  var label = options.label || 'label';
  var geometry = options.geometry || 'location';

  // Remove any users no longer attending from tracking
  var ids = locations.map(function(location) { return location._id; });

  // Remove any attendants no longer in attendance from the map and our list
  for (id in self.attendants) {
    if (ids.indexOf(id) == -1) {
      self.attendants[id].removeFrom(self.mymap);
      delete self.attendants[id];
    }
  }

  // Add the users we are tracking
  locations.forEach(function(location) {
    var longitude = location[geometry].coordinates[0];
    var latitude = location[geometry].coordinates[1];
    var key = location[id];

    if (self.attendants[key]) {
      self.attendants[key]
        .setLatLng([latitude, longitude])
    } else {
      var greenIcon = new L.Icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Create a green marker
      var marker = L.marker(
        [latitude, longitude],
        {icon: greenIcon});
      // Save to our attendants map
      self.attendants[key] = marker;
      // Bind tooltip
      marker.bindTooltip(location[label]);
      // Add marker to map
      marker.addTo(self.mymap);
    }
  });
}

Leaflet.prototype.getZoom = function() {
  return this.mymap.getZoom();
}

Leaflet.prototype.center = function(latitude, longitude, zoom) {
  zoom = zoom || this.mymap.getZoom();
  this.mymap.setView([latitude, longitude], zoom);
}

Leaflet.prototype.centerFlyTo = function(latitude, longitude, zoom) {
  zoom = zoom || this.mymap.getZoom();
  this.mymap.flyTo([latitude, longitude], zoom);
}

Leaflet.prototype.setCurrentLocationMarker = function(latitude, longitude, accuracy) {
  if (!this.currentLocation) {
    this.currentLocation = L.marker([latitude, longitude]);
    this.currentLocation.addTo(this.mymap);
  }

  // Set the current location
  this.currentLocation.setLatLng(L.latLng([latitude, longitude]));
}

Leaflet.prototype.addPointMarkerAndCircle = function(latitude, longitude, radius, tooltip) {
  // Add starting point shape
  var layer = L.geoJSON({
    type: 'Point', coordinates: [longitude, latitude]
  });

  layer.bindTooltip(tooltip);
  layer.addTo(this.mymap);

  // Create circle and return
  return L.circle([latitude, longitude], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: radius
  }).addTo(this.mymap);
}

Leaflet.prototype.invalidateSize = function() {
  this.mymap.invalidateSize();
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