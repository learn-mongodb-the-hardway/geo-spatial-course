function setup(options) {
  // Create the mapbox view
  var mymap = L.map(options.mapDivId).setView([51.505, -0.09], 18);

  // Set up the map
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + options.accessToken, {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(mymap);

  // Render any of the pubs
  options.searchPubs.forEach(function(pub) {
    var layer = L.geoJSON(pub.geometry)
    layer.bindTooltip(pub.name);
    layer.on('click', function() { 
      addPub(options, pub);
    });
    layer.addTo(mymap);
  });

  // If we have some pubs move to them
  if (options.searchPubs.length) {
    mymap.flyTo(
      L.latLng(options.searchPubs[0].geometry.coordinates[0][0][1], options.searchPubs[0].geometry.coordinates[0][0][0]), 
      mymap.getMaxZoom() - 6);
  };
}

function addPub(options, pub) {
  console.log(options)
  console.log(options.url + "/add/" + options.id)
  console.log(pub)
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