var BrowserInteractions = function() {}

/**
 * Simple AJAX POST method
 */
BrowserInteractions.prototype.postJSON = function(url, object, options, callback) {
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

/**
 * Simple AJAX GET method
 */
BrowserInteractions.prototype.getJSON = function(url, options, callback) {
  if (typeof options === 'function') (callback = options), (options = {});

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    // Valid XML Request response
    if (xhr.status !== 200) {
      return callback('Request failed.  Returned status of ' + xhr.status);
    }

    // Return the result
    callback(null, options.parseJSON ? JSON.parse(xhr.responseText) : xhr.responseText);
  };

  xhr.send();
}

BrowserInteractions.prototype.setDiv = function(id, text) {
  document.getElementById(id).innerHTML = text;
}

module.exports = { BrowserInteractions }