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

function retrieveGeoLocation(callbacks) {
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
    return callbacks.forEach(callback => {
      callback(null, location);
    });
  }

  var geoError = function(error) {
    callbacks.forEach(callback => {
      callback(error);
    });
  }

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
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

