const { readFileSync } = require('fs');
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
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;
var crawl = null;

// Routes
const { createCrawlGet, createCrawlIdGet, createCrawlPost } = require('../../../lib/admin/routes/crawls/create');

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../../token.txt`, 'utf8');
}

describe("/crawls/create Routes", () => {
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

  describe("/crawls/create get", async () => {

    it('update the current pub crawl starting location ', async () => {
      var doc = null
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        // crawlId: crawlId
      }, models: { crawl }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await createCrawlGet(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector("#fromdate"));
    });

  });

  describe("/crawls/create/:crawlId get", async () => {

    it('successfully render crawl get', async () => {
      var doc = null;
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

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
      await createCrawlIdGet(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal('Crawl 1', doc.window.document.querySelector("#name").value);
      assert.equal('Crawl Description', doc.window.document.querySelector("#description").value);
      assert(doc.window.document.querySelector("#fromdate").value);
      assert(doc.window.document.querySelector("#todate").value);
    });

    it('fail due missing crawlId', async () => {
      const crawlId = ObjectId();
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
      }, models: { crawl }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        assert(url.indexOf('/error?error=') != -1);
      }});

      // Execute the indexGet
      await createCrawlIdGet(req, res)
    });
  });

  describe("/crawls/create post", async () => {

    it('successfully create a new pub crawl', async () => {
      var doc = null;
      // Use an object id as username and user id
      const username = ObjectId().toString();

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {}, body: {
        name: 'My test crawl', description: 'My test crawl',
        fromdate: moment(new Date()).format('HH:mm MM/DD/YYYY'),
        todate: moment(new Date()).format('HH:mm MM/DD/YYYY')
      }, session: {}, options: {}, baseUrl: '/admin', user: {
        username: username
      }})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await createCrawlPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal('My test crawl', doc.window.document.querySelector("#name").value);
      assert.equal('My test crawl', doc.window.document.querySelector("#description").value);
      assert(doc.window.document.querySelector("#fromdate").value);
      assert(doc.window.document.querySelector("#todate").value);

      // Grab the crawl
      const doc1 = await crawl.findByUsername(username);
      assert(doc1[0]);
      assert.equal('My test crawl', doc1[0].name);
      assert.equal('My test crawl', doc1[0].description);
      assert.equal(username, doc1[0].username);
      assert.equal(false, doc1[0].published);
      assert(doc1[0].from);
      assert(doc1[0].to);
      assert(doc1[0].createdOn);
    });

    it('should fail due to no fields passed in', async () => {
      var doc = null;
      // Use an object id as username and user id
      const username = ObjectId().toString();

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { crawl }, params: {}, body: {
        name: 'My test crawl'
      }, session: {}, options: {}, baseUrl: '/admin', user: {
        username: username
      }})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await createCrawlPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal('My test crawl', doc.window.document.querySelector("#name").value);
      assert.equal(true, doc.window.document.querySelector("#description").classList.contains('is-invalid'));
      assert.equal(true, doc.window.document.querySelector("#fromdate").classList.contains('is-invalid'));
      assert.equal(true, doc.window.document.querySelector("#todate").classList.contains('is-invalid'));
    });
  });
});