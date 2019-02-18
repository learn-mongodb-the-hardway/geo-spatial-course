/**
 * Global variables
 */
var geoOptions = {
  // Max wait time in ms before timing out the location request
  timeout: 10000,
  // The maximum age of cached geo location data in ms
  maximumAge: 5 * 60 * 1000,
  // Enable high accuracy mode
  enableHighAccuracy: true
}

var mymap = null;
var intervalId = null;
var currentLocation = null;
var currentPositionMarker = null;

function getGeoLocation(callbacks) {
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

    // If the location has not changed don't post
    if (location.equals(currentLocation)) {
      return callbacks.forEach(callback => {
        callback(null, currentLocation);
      });
    }

    // Post the current location
    post("/mobile/location", location, (error, result) => {
      // Let callbacks know
      callbacks.forEach(callback => {
        if (error) return callback(error);
        callback(null, new Location(result));
      });
    });
  }

  var geoError = function(error) {
    console.log(error);
  }

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
}

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

/**
 * Simple AJAX POST method
 */
function post(url, object, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'mobile/location');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    if (xhr.status !== 200) {
      return callback('Request failed.  Returned status of ' + xhr.status);
    }

    callback(null, JSON.parse(xhr.responseText));
  };

  xhr.send(JSON.stringify(object));
}

function setup(options) {
  getGeoLocation([(err, result) => {
    // Set default coordinates
    currentLocation = new Location({ latitude: 51.505, longitude: -0.09 });
    if (result) {
      currentLocation = result;
    }

    // Create the mapbox view
    mymap = L.map(options.mapDivId).setView(currentLocation.toArray(), 18);

    // Set up the map
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + options.accessToken, {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(mymap);

    // Set the marker for the current location
    currentPositionMarker = L.marker(currentLocation.toArray());
    // Add marker to the map
    currentPositionMarker.addTo(mymap);

    // Setup the interval check
    intervalId = setInterval(executeInterval, options.intervalMS);
  }]);
}

function locationsEqual(location1, location2) {
  return location1.equals(location2);
}

// Run the GeoLocation month
function executeInterval() {
  getGeoLocation([(err, result) => {
    if(err != null) return;

    // If we have the same location don't do anything
    if (locationsEqual(currentLocation, result)) {
      return;
    }

    // Remove the current marker
    if (currentLocation && currentPositionMarker) {
      currentPositionMarker.removeFrom(mymap);
    }

    // Save the current location
    currentLocation = result;

    // Create a new marker
    currentPositionMarker = L.marker(currentLocation.toArray());
    currentPositionMarker.addTo(mymap);

    // Fly to the map location
    mymap.flyTo(
      L.latLng(currentLocation.toArray()[0], currentLocation.toArray()[1]), 
      mymap.getMaxZoom());
  }]);
}