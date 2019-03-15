// Import all the classes
const {AdminClient, addPub } = require('./admin_client');
const { PubCrawlClient, mobileSetup } = require('./mobile_client');
const { Leaflet } = require('./leaflet');
const { GeoLocation } = require('./geo_location');

// Map the classes to the window global object
window.AdminClient = AdminClient;
window.addPub = addPub;
window.PubCrawlClient = PubCrawlClient;
window.mobileSetup = mobileSetup;
window.Leaflet = Leaflet;
window.GeoLocation = GeoLocation;