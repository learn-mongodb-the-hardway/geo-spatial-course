const assert = require('assert');
const { MongoClient } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;

// Routes
const { logoutGet } = require('../../../lib/admin/routes/logout');

describe("Admin /logout Route", () => {
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
      var logoutCalled = false;        
      // Prepare the mock request
      const req = mockRequest({ db: database, body: {}, session: {}, options: {}, baseUrl: '/admin', logout: () => {
        logoutCalled = true;
      }});
      const res = mockResponse({ redirect: async function(url) {
        // Do assertions
        assert.equal('/', url);
      }});

      // Execute the indexGet
      await logoutGet(req, res)
      assert(logoutCalled);
    });
  });
});