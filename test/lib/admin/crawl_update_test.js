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
var crawl = null;

// Routes
const { updatePost } = require('../../../lib/admin/routes/crawls/update');

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

    it('successfully update pub crawl', async () => {
      const crawlId = ObjectId();
      var doc = null;
      const time = new Date().getTime();

      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", crawlId.toString(), new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 200000), true, [], {});

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {
        crawlId: crawlId
      }, body: {
        name: 'Crawl 2', description: 'Crawl 2 Description',
        fromdate: moment(new Date(time)).format('HH:mm MM/DD/YYYY'),
        todate: moment(new Date(time + 2000000)).format('HH:mm MM/DD/YYYY')
      }, session: {}, options: {}, user: {
        username: "peter"
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await updatePost(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal('Crawl 2', doc.window.document.querySelector("#name").value);
      assert.equal('Crawl 2 Description', doc.window.document.querySelector("#description").value);
      assert(doc.window.document.querySelector("#fromdate").value);
      assert(doc.window.document.querySelector("#todate").value);

      // Grab the crawl
      const doc1 = await crawl.findByUsername(crawlId.toString());
      assert(doc1[0]);
      assert.equal('Crawl 2', doc1[0].name);
      assert.equal('Crawl 2 Description', doc1[0].description);
      assert.equal(crawlId.toString(), doc1[0].username);
      assert.equal(true, doc1[0].published);
      assert(doc1[0].from);
      assert(doc1[0].to);
      assert(doc1[0].updatedOn);
    });

    it('missing crawl', async () => {
      var doc = null;
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", crawlId.toString(), new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {
        crawlId: ObjectId()
      }, body: {}, session: {}, options: {}, user: {
        username: crawlId.toString()
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        doc = url;
      }});

      // Execute the indexGet
      await updatePost(req, res)
      await waitOneTick();

      // Assertions
      assert.notEqual(-1, doc.indexOf('/error?error=could%20not%20locate'));
    });

    it('missing fields', async () => {
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
      await updatePost(req, res)
      await waitOneTick();

      // Assertions
      assert(result.indexOf("/error?error=") != -1);
    });
  });
});