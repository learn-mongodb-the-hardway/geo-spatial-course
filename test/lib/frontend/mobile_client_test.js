const assert = require('assert');
const ejs = require('ejs');
const { JSDOM } = require("jsdom");
const sinon = require('sinon');
const { PubCrawlClient, mobileSetup } = require('../../../lib/frontend/mobile_client');
const { BrowserInteractions } = require('../../../lib/frontend/shared');
const { Leaflet } = require('../../../lib/frontend/leaflet');
const { GeoLocation } = require('../../../lib/frontend/geo_location');

describe("PubCrawlClient", () => {
  before(async () => {});

  after(async () => {});

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("setup", async () => {

    it('successfully execute setup top level steps', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();
      const browser = new BrowserInteractions();

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('init').once();

      // Create a mock for GeoLocation
      const geoLocationMock = sinon.mock(geoLocation);
      geoLocationMock.expects('location').once();

      // Fake GeoLocation
      var factory = function() {
        return geoLocation;   
      }

      // Create a client
      const client = new PubCrawlClient(leaflet, factory, browser, {
        mapDivId: 'map',
        accessToken: 'peterparker'
      });

      // Execute setup
      client.setup();

      // Verify the mocks
      leafletMock.verify();
      geoLocationMock.verify();
    });

    it('successfully return location on setup', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();
      const browser = new BrowserInteractions();

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('init').once();
      leafletMock.expects('invalidateSize').once();
      leafletMock.expects('setCurrentLocationMarker').once();
      leafletMock.expects('center').once();

      // Create a mock for GeoLocation
      const geoLocationMock = sinon.mock(geoLocation);
      geoLocationMock.expects('location').once();

      // Create a mock for the BrowserInteractions
      const browserMock = sinon.mock(browser);
      browserMock.expects('postJSON').once();

      // Fake GeoLocation
      var factory = function() {
        return geoLocation;   
      }

      // Create a client
      const client = new PubCrawlClient(leaflet, factory, browser, {
        mapDivId: 'map',
        accessToken: 'peterparker'
      });

      // Execute setup
      client.setup();

      // Trigger the location callback successfully
      geoLocation.listeners['location'][0]({
        coords: {
          latitude: 100, longitude: 50
        }
      });

      // Verify the mocks
      leafletMock.verify();
      geoLocationMock.verify();
      browserMock.verify();
    });

  });

  describe("loadAttendants", async () => {

    it('successfully call getJSON', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();
      const browser = new BrowserInteractions();

      // Create a mock for the BrowserInteractions
      const browserMock = sinon.mock(browser);
      browserMock.expects('setDiv').once();

      // Fake GeoLocation
      var factory = function() {
        return geoLocation;   
      }

      // Create a client
      const client = new PubCrawlClient(leaflet, factory, browser, {
        mapDivId: 'map',
        accessToken: 'peterparker'
      });

      // Trigger result returned
      browser.getJSON = function(path, options, cb) {
        cb(null, '');
      }
      
      var callbackCalled = false;
      // Execute setup
      client.loadAttendants(1, () => {
        callbackCalled = true;
      });

      // Assertions
      assert(callbackCalled);

      // Verify the mocks
      browserMock.verify();
    });

  });

  describe("centerNextPub", async () => {

    it('successfully call centerNextPub', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();
      const browser = new BrowserInteractions();

      // Fake GeoLocation
      var factory = function() {
        return geoLocation;   
      }

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('centerFlyTo').once();
      leafletMock.expects('getZoom').once();

      // Create a client
      const client = new PubCrawlClient(leaflet, factory, browser, {
        mapDivId: 'map',
        accessToken: 'peterparker'
      });

      // Set some pubs
      client.pubs = [{
        geometry: {
          type: 'Point', coordinates: [10, 10]
        }
      }];
      
      // Execute setup
      client.centerNextPub();

      // Verify the mocks
      leafletMock.verify();
    });

  });

  describe("center", async () => {

    it('successfully call center', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();
      const browser = new BrowserInteractions();

      // Fake GeoLocation
      var factory = function() {
        return geoLocation;   
      }

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('setCurrentLocationMarker').once();
      leafletMock.expects('center').once();

      // Create a client
      const client = new PubCrawlClient(leaflet, factory, browser, {
        mapDivId: 'map',
        accessToken: 'peterparker'
      });

      // Set some pubs
      client.currentLocation = [10, 10];
      
      // Execute setup
      client.center();

      // Verify the mocks
      leafletMock.verify();
    });

  });
});

describe("mobileSetup", async () => {
    
  it('correctly execute mobileSetup', async () => {
    const browser = new BrowserInteractions();
    const geoLocation = new GeoLocation();
    
    // Create global mock
    const browserMock = sinon.mock(browser);

    // Create a mock for GeoLocation
    const geoLocationMock = sinon.mock(geoLocation);
    geoLocationMock.expects('location').once();

    // Execute add pub method
    mobileSetup({}, browser, geoLocation);

    // Verify the mocks
    browserMock.verify();
    geoLocationMock.verify();
  });

  it('correctly execute mobileSetup and return location event', async () => {
    const browser = new BrowserInteractions();
    const geoLocation = new GeoLocation();

    // Trigger result returned
    browser.postJSON = function(path, obj, options, cb) {
      cb(null, '');
    }
    
    // Create global mock
    const browserMock = sinon.mock(browser);
    browserMock.expects('setDiv').once();
    browserMock.expects('setTimeout').once();

    // Create a mock for GeoLocation
    const geoLocationMock = sinon.mock(geoLocation);
    geoLocationMock.expects('location').once();

    // Execute add pub method
    mobileSetup({}, browser, geoLocation);

    // Execute successful location
    geoLocation.listeners['location'][0]({
      coords: {
        latitude: 100, longitude: 50
      }
    });

    // Verify the mocks
    browserMock.verify();
    geoLocationMock.verify();
  });

});