const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const moment = require('moment');
const { waitOneTick } = require('../utils');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;

// Routes
const { changePasswordGet, changePasswordPost } = require('../../../lib/admin/routes/change_password');

describe("/crawls/create Routes", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.dropDatabase();
    user = new User(database.collection('users'));
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("/change_password get", async () => {

    it('render the change_password form', async () => {
      var doc = null
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        // crawlId: crawlId
      }, body: {}, session: {}, options: {}, baseUrl: '/admin', models: { user }})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await changePasswordGet(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector("#current_password"));
      assert.notEqual(null, doc.window.document.querySelector("#password"));
      assert.notEqual(null, doc.window.document.querySelector("#confirm_password"));
    });
  });

  describe("/change_password post", async () => {

    it('successfully user password', async () => {
      const userId = ObjectId();
      await user.create(userId, "petrus_100", "petrus_100", "petrus_100", "petrus_100", {});
      const userDoc = await user.findById(userId);

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, params: {}, body: {
        current_password: 'petrus_100', password: 'petrus_200', confirm_password: 'petrus_200'
      }, session: {}, options: {}, baseUrl: '/admin', user: userDoc })
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await changePasswordPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector('#success'));

      // Read the user doc again
      const userDocChanged = await user.findById(userId);
      // Validate password changed
      assert.notEqual(userDoc.password, userDocChanged.password);
    });

    it('should fail due to no fields set', async () => {
      const userId = ObjectId();
      await user.create(userId, "petrus_400", "petrus_400", "petrus_400", "petrus_400", {});
      const userDoc = await user.findById(userId);

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, params: {}, body: {
        // current_password: 'petrus_100', password: 'petrus_200', confirm_password: 'petrus_200'
      }, session: {}, options: {}, baseUrl: '/admin', user: userDoc })
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await changePasswordPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal(true, doc.window.document.querySelector("#current_password").classList.contains('is-invalid'));
      assert.equal(true, doc.window.document.querySelector("#password").classList.contains('is-invalid'));
      assert.equal(true, doc.window.document.querySelector("#confirm_password").classList.contains('is-invalid'));
    });

    it('should fail due to passwords not matching', async () => {
      const userId = ObjectId();
      await user.create(userId, "petrus_600", "petrus_600", "petrus_600", "petrus_600", {});
      const userDoc = await user.findById(userId);

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, params: {}, body: {
        current_password: 'petrus_600', password: 'petrus_100', confirm_password: 'petrus_200'
      }, session: {}, options: {}, baseUrl: '/admin', user: userDoc })
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await changePasswordPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector('#error'));
    });

    it('should fail due to current password not matching', async () => {
      const userId = ObjectId();
      await user.create(userId, "petrus_600", "petrus_700", "petrus_600", "petrus_600", {});
      const userDoc = await user.findById(userId);

      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, params: {}, body: {
        current_password: 'petrus_300', password: 'petrus_200', confirm_password: 'petrus_200'
      }, session: {}, options: {}, baseUrl: '/admin', user: userDoc })
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result);
      }});

      // Execute the indexGet
      await changePasswordPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector('#error'));
    });
  });
});