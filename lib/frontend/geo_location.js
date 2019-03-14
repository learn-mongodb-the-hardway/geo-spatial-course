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