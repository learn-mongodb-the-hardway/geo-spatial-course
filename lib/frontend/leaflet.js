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