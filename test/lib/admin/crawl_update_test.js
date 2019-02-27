const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const { Crawl } = require('../../../lib/models/crawl');
const moment = require('moment');

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var crawl = null;

// Routes
const { updatePost } = require('../../../lib/admin/routes/crawls/update');

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

  describe("/crawls/publish get", async () => {

    it('successfully update pub crawl', async () => {
      const crawlId = ObjectId();
      var doc = null;
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", crawlId.toString(), new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {
        name: 'Crawl 2', description: 'Crawl 2 Description',
        fromdate: moment(new Date()).format('HH:mm MM/DD/YYYY'),
        todate: moment(new Date()).format('HH:mm MM/DD/YYYY')
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

      // Assertions
      process.nextTick(async () => {
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
    });

    it('missing crawl', async () => {
      var doc = null;
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", crawlId.toString(), new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {}, session: {}, options: {}, user: {
        username: crawlId.toString()
      }, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await updatePost(req, res)

      // Assertions
      process.nextTick(async () => {
        assert.equal(true, doc.window.document.querySelector("#name").classList.contains('is-invalid'));
        assert.equal(true, doc.window.document.querySelector("#description").classList.contains('is-invalid'));
        assert.equal(true, doc.window.document.querySelector("#fromdate").classList.contains('is-invalid'));
        assert.equal(true, doc.window.document.querySelector("#todate").classList.contains('is-invalid'));
      });
    });

    it('missing fields', async () => {
      const crawlId = ObjectId();
      var result = null;
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {}, session: {}, options: {}, user: {
        username: crawlId.toString()
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        result = url;
      }});

      // Execute the indexGet
      await updatePost(req, res)

      // Assertions
      process.nextTick(async () => {
        assert(result.indexOf("/error?error=") != -1);
      });
    });
  });
});