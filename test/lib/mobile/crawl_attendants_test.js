const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const { Crawl } = require('../../../lib/models/crawl');
const moment = require('moment');
const { waitOneTick } = require('../utils');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;
var crawl = null;

// Routes
const { attendantsGet, attendantsLocationsGetJSON } = require('../../../lib/mobile/routes/attendants');

describe("/mobile/attendants Routes", () => {
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

  describe("/mobile/attendants get", async () => {

    it('render attendant list successfully', async () => {
      const crawlId = ObjectId();
      const firstAttendantId = ObjectId();
      const secondAttendantId = ObjectId();

      // Attempt to create the user
      await user.create(firstAttendantId, "petrus petrus", "petrus", "petrus", "petrus", {});
      await user.create(secondAttendantId, "petrus2 petrus2", "petrus2", "petrus2", "petrus2", {});

      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {
        attendants: [firstAttendantId, secondAttendantId]
      });
      
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, models: { crawl }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await attendantsGet(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal("petrus petrus", doc.window.document.querySelectorAll('li[class="list-group-item"]')[0].innerHTML);
      assert.equal("petrus2 petrus2", doc.window.document.querySelectorAll('li[class="list-group-item"]')[1].innerHTML);
    });

    it('no crawl exits', async () => {
      const crawlId = ObjectId();
      
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, models: { crawl }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await attendantsGet(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal(0, doc.window.document.querySelectorAll('li[class="list-group-item"]').length);
    });
  });

  describe("/mobile/locations get", async () => {

    it('render attendants locations list successfully', async () => {
      const crawlId = ObjectId();
      const firstAttendantId = ObjectId();
      const secondAttendantId = ObjectId();

      // Attempt to create the user
      await user.create(firstAttendantId, "petrus petrus", "petrus10", "petrus", "petrus", {});
      await user.create(secondAttendantId, "petrus2 petrus2", "petrus20", "petrus2", "petrus2", {
        location: {
          type: 'Point', coordinates: [54.1, 11.1]
        }
      });

      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {
        attendants: [firstAttendantId, secondAttendantId]
      });
      
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, models: { crawl }, body: {}, session: {}, options: {}, baseUrl: '/admin', user: { _id: firstAttendantId }})
      const res = mockResponse({ redirect: async function(url) {
      }, send: function(string) {
        doc = JSON.parse(string);
      }});

      // Execute the indexGet
      await attendantsLocationsGetJSON(req, res)
      await waitOneTick();

      // Just locate the document by name
      function findByName(name, locations) {
        for (location of locations) {
          if (location.name == name) return location;
        }
      }

      // Do assertions
      assert.equal(1, doc.locations.length);
      assert.equal('petrus2 petrus2', findByName('petrus2 petrus2', doc.locations).name);
      assert.notEqual(null, findByName('petrus2 petrus2', doc.locations).location)
      assert.deepEqual({
        type: 'Point', coordinates: [54.1, 11.1]
      }, findByName('petrus2 petrus2', doc.locations).location)
    });

    it('no crawl exits', async () => {
      const crawlId = ObjectId();
      
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, models: { crawl }, body: {}, session: {}, options: {}, baseUrl: '/admin', user: { _id: new ObjectId() }})
      const res = mockResponse({ redirect: async function(url) {
      }, send: function(string) {
        doc = JSON.parse(string);
      }});

      // Execute the indexGet
      await attendantsLocationsGetJSON(req, res)
      await waitOneTick();

      // Do assertions
      assert.deepEqual({ _id: crawlId.toString(), locations: [] }, doc);
    });
  });
});