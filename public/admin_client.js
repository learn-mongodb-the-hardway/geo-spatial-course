function setup(options) {
  var coordinates = [51.505, -0.09];

  if (options.location && options.location.center) {
    coordinates = [options.location.center[1], options.location.center[0]];  
  }

  // Create the mapbox view
  var mymap = L.map(options.mapDivId).setView(coordinates, 18);
  // Set up the map
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + options.accessToken, {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(mymap);

  // Render any of search result pubs
  options.searchPubs.forEach(function(pub) {
    var layer = L.geoJSON(pub.geometry)
    layer.bindTooltip(pub.name);
    layer.on('click', function() { 
      addPub(options, pub);
    });
    layer.addTo(mymap);
  });

  // Location is defined, draw on the map
  if (options.location && options.location.center) {
    // Add starting point shape
    var layer = L.geoJSON(options.location.geometry);
    layer.bindTooltip(options.location.placeName);
    layer.addTo(mymap);

    // Create circle
    var circle = L.circle([options.location.center[1], options.location.center[0]], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: options.locationDistance
    }).addTo(mymap);
  }

  // Render any pubs in the walk
  options.pubs.forEach(function(pub, index) {
    console.log("===== add pub")
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
    }).addTo(mymap);
  });
  
  // If we have some pubs move to them
  if (options.searchPubs.length) {
    // Get the first element
    if (options.searchPubs[0].geometry.type == "Point") {
      var coordinates = [
        options.searchPubs[0].geometry.coordinates[1], 
        options.searchPubs[0].geometry.coordinates[0]];  
    } else {
      var coordinates = [
        options.searchPubs[0].geometry.coordinates[0][0][1], 
        options.searchPubs[0].geometry.coordinates[0][0][0]];
    }

    mymap.flyTo(
      L.latLng(coordinates), 
      mymap.getMaxZoom() - 6);
  }
}

function addPub(options, pub) {
  // Post the pub id
  postJSON(options.url + "/add/" + options.id, pub, { parseJSON: false }, function(err, result) {
    if (err) {
      console.log(err);
      return alert("Failed to add Pub");
    }

    // We have the list of pubs
    setDiv("pubs", result);
  });
}

function setDiv(id, text) {
  document.getElementById(id).innerHTML = text;
}