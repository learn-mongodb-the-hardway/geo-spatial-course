const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const { Crawl } = require('../../../lib/models/crawl');
const { waitOneTick } = require('../utils');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var crawl = null;

// Routes
const { unpublishGet } = require('../../../lib/admin/routes/crawls/unpublish');

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

  describe("/crawls/publish get", async () => {

    it('successfully publish pub crawl', async () => {
      var doc = null;
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {
        crawlId: crawlId
      }, body: {}, session: {}, options: {}, user: {
        username: "peter"
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await unpublishGet(req, res)
      await waitOneTick();

      // Assertions
      assert.equal(1, doc.window.document.querySelectorAll("tbody tr").length);
      
      doc = await crawl.findOneById(crawlId);
      assert(doc);
      assert.equal(false, doc.published);  
    });

    it('missing crawl', async () => {
      const crawlId = ObjectId();
      var result = null;
      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {
        crawlId: crawlId
      }, body: {}, session: {}, options: {}, user: {
        username: crawlId.toString()
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        result = url;
      }});

      // Execute the indexGet
      await unpublishGet(req, res)
      await waitOneTick();

      // Assertions
      assert(result.indexOf("/error?error=") != -1);
    });

  });
});