const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const { Crawl } = require('../../../lib/models/crawl');
const { waitOneTick } = require('../utils');

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;
var crawl = null;

// Routes
const { locationSetGet, locationFindPost } = require('../../../lib/admin/routes/crawls/location');

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../../token.txt`, 'utf8');
}

describe("/crawls/location Routes", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.dropDatabase();
    user = new User(database.collection('users'));
    crawl = new Crawl(database.collection('crawls'));
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("./location/set get", async () => {

    it('update the current pub crawl starting location ', async () => {
      var doc = null;
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {
        searchLocations: [{
          center: [100, 100]
        }],
        locationDistance: 100
      });

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {
        crawlId: crawlId
      }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
          window.$ = function() {
            return {
              datetimepicker: function() {},
              on: function() {}
            }
          }        

          window.AdminClient = function() {
            return {
              setup: function() {}
            }
          }
        }});
      }});

      // Execute the indexGet
      await locationSetGet(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      // Locate the crawl
      doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.location)
      assert(doc.location.center);
      assert(doc.location.polygon);
      assert.equal('Polygon', doc.location.polygon.type);
    });
  });

  describe("./location/find post", async () => {
    it('no search address provided', async () => {
      const crawlId = ObjectId();
      var result = null;
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {
        searchLocations: [{
          center: [100, 100]
        }],
        locationDistance: 100
      });

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {
        crawlId: crawlId
      }, body: {}, session: {}, options: {
        accessToken: accessToken
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        result = url;
      }});

      // Execute the indexGet
      await locationFindPost(req, res)

      // Assertions
      assert(result.indexOf('/error?error=') != -1);
    });

    it('correctly set search pubs', async () => {
      var doc = null;
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {
        searchLocations: [{
          center: [100, 100]
        }],
        locationDistance: 100
      });

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {
        crawlId: crawlId
      }, body: {
        address: 'N1'
      }, session: {}, options: {
        accessToken: accessToken
      }, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
          window.$ = function() {
            return {
              datetimepicker: function() {},
              on: function() {}
            }
          }        

          window.AdminClient = function() {
            return {
              setup: function() {}
            }
          }
        }});
      }});

      // Execute the indexGet
      await locationFindPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      assert.notEqual(null, doc.window.document.querySelector("#pubSearchTable"));

      // Locate the crawl
      doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.searchLocations)
      assert(doc.searchLocations.length);
    });
  });
});