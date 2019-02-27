const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;

// Routes
const { loginGet, loginPost } = require('../../../lib/admin/routes/login');

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../../token.txt`, 'utf8');
}

describe("Admin /login Route", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.dropDatabase();
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("get", async () => {

    it('render /login', async () => {
      var doc = null;
      // Prepare the mock request
      const req = mockRequest({ db: database, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await loginGet(req, res)

      // Do assertions
      process.nextTick(async () => {
        assert.notEqual(null, doc.window.document.querySelector("#username"));
        assert.notEqual(null, doc.window.document.querySelector("#password"));
        assert.notEqual(null, doc.window.document.querySelector("#login_submit"));
      });
    });
  });

  describe("post", async () => {

    it('render /login', async () => {
        // Prepare the mock request
      const req = mockRequest({ db: database, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        // Do assertions
        assert.equal('/admin/crawls', url);
      }});

      // Execute the indexGet
      await loginPost(req, res)
    });
  });
});