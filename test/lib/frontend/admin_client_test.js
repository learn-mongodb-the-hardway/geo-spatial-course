const assert = require('assert');
const ejs = require('ejs');
const { JSDOM } = require("jsdom");
const sinon = require('sinon');
const { AdminClient, addPub } = require('../../../lib/frontend/admin_client');
const { BrowserInteractions } = require('../../../lib/frontend/shared');
const { Leaflet } = require('../../../lib/frontend/leaflet');
const { GeoLocation } = require('../../../lib/frontend/geo_location');

describe("AdminClient", () => {
  before(async () => {});

  after(async () => {});

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("setup", async () => {

    it('successfully execute setup top level steps', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('init').once();

      // Create a mock for GeoLocation
      const geoLocationMock = sinon.mock(geoLocation);
      geoLocationMock.expects('location').once();

      // Create a client
      const client = new AdminClient(leaflet, geoLocation, {
        mapDivId: 'map',
        accessToken: 'peterparker',
        location: {},
        locationDistance: 100,
        searchPubs: [],
        pubs: [],
      });

      // Execute the setup
      client.setup();

      // Verify the mocks
      leafletMock.verify();
      geoLocationMock.verify();
    });

    it('successfully return location on setup no [pubs and searchPubs]', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('init').once();
      leafletMock.expects('center').once();
      leafletMock.expects('addMarkers').exactly(2);

      // Create a mock for GeoLocation
      const geoLocationMock = sinon.mock(geoLocation);
      geoLocationMock.expects('location').once();

      // Create a client
      const client = new AdminClient(leaflet, geoLocation, {
        mapDivId: 'map',
        accessToken: 'peterparker',
        location: {},
        locationDistance: 100,
        searchPubs: [],
        pubs: [],
      });

      // Execute the setup
      client.setup();

      // Trigger the location callback successfully
      geoLocation.listeners['location'][0]({
        latitude: 100, longitude: 50
      });

      // Verify the mocks
      leafletMock.verify();
      geoLocationMock.verify();
    });

    it('successfully return location on setup with [pubs and searchPubs]', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('init').once();
      leafletMock.expects('center').once();
      leafletMock.expects('addMarkers').exactly(2);
      leafletMock.expects('moveToLocation').once();

      // Create a mock for GeoLocation
      const geoLocationMock = sinon.mock(geoLocation);
      geoLocationMock.expects('location').once();

      // Create a client
      const client = new AdminClient(leaflet, geoLocation, {
        mapDivId: 'map',
        accessToken: 'peterparker',
        location: {},
        locationDistance: 100,
        searchPubs: [{
          name: 'peters pub', geometry: {
            type: 'Point', coordinates: [10, 10]
          }
        }],
        pubs: [{
          _id: 1, name: 'peters pub', geometry: {
            type: 'Point', coordinates: [10, 10]
          }
        }],
      });

      // Execute the setup
      client.setup();

      // Trigger the location callback successfully
      geoLocation.listeners['location'][0]({
        latitude: 100, longitude: 50
      });

      // Verify the mocks
      leafletMock.verify();
      geoLocationMock.verify();
    });

    it('return error location on setup', async () => {
      const leaflet = new Leaflet();
      const geoLocation = new GeoLocation();

      // Create a mock for Leaflet
      const leafletMock = sinon.mock(leaflet);
      leafletMock.expects('init').once();
      // leafletMock.expects('center').once();
      // leafletMock.expects('addMarkers').exactly(2);
      // leafletMock.expects('moveToLocation').once();

      // Create a mock for GeoLocation
      const geoLocationMock = sinon.mock(geoLocation);
      geoLocationMock.expects('location').once();

      // alert should be called
      global.alert = function() {};
      const globalMock = sinon.mock(global);
      globalMock.expects('alert').once();

      // Console mock
      const consoleMock = sinon.mock(console);
      consoleMock.expects('log').once();

      // Create a client
      const client = new AdminClient(leaflet, geoLocation, {
        mapDivId: 'map',
        accessToken: 'peterparker',
        location: {},
        locationDistance: 100,
        searchPubs: [],
        pubs: [],
      });

      // Execute the setup
      client.setup();

      // Trigger the location callback successfully
      geoLocation.listeners['error'][0]({
        message: "Error on location"
      });

      // Verify the mocks
      leafletMock.verify();
      geoLocationMock.verify();
      globalMock.verify();
      consoleMock.verify();
    });
  });

  describe("addPub", async () => {
    
    it('correctly execute postJSON', async () => {
      const browser = new BrowserInteractions();
      // Create global mock
      const browserMock = sinon.mock(browser);
      browserMock.expects('postJSON').once();

      // Execute add pub method
      addPub({
        url: '/admin', id: 1, _id: 100
      }, browser)
    });

    it('correctly execute postJSON and return result', async () => {
      const browser = new BrowserInteractions();
      // Create global mock
      const browserMock = sinon.mock(browser);
      browserMock.expects('setDiv').once();

      // Trigger result returned
      browser.postJSON = function(path, obj, options, cb) {
        cb(null, '');
      }

      // Execute add pub method
      addPub({
        url: '/admin', id: 1, _id: 100
      }, browser)
    });

  });
});