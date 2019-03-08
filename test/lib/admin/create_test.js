const assert = require('assert');
const ejs = require('ejs');
const { MongoClient } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const { waitOneTick } = require('../utils');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;

// Routes
const { createGet, createPost } = require('../../../lib/admin/routes/create');

describe("Admin /create Route", () => {
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

  describe("get", async () => {

    it('render /login', async () => {
      var doc = null;
      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {}});
      }});

      // Execute the indexGet
      await createGet(req, res)
      await waitOneTick();

      // Do assertions
      assert.notEqual(null, doc.window.document.querySelector("#username"));
      assert.notEqual(null, doc.window.document.querySelector("#password"));
      assert.notEqual(null, doc.window.document.querySelector("#confirm_password"));
    });
  });

  describe("post", async () => {

    it('all fields are null', async () => {
      var doc = null;
      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {}});
      }});

      // Execute the indexGet
      await createPost(req, res)
      await waitOneTick();

      // Do assertions
      assert.equal(true, doc.window.document.querySelector("#username").classList.contains('is-invalid'));
      assert.equal(true, doc.window.document.querySelector("#password").classList.contains('is-invalid'));
      assert.equal(true, doc.window.document.querySelector("#confirm_password").classList.contains('is-invalid'));
    });

    it('password and confirm_password not equal', async () => {
      var doc = null;
      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, body: {
        name: 'petrus', username: 'petrus', password: 'pass', confirm_password: 'pass2' 
      }, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {}});
      }});

      // Execute the indexGet
      await createPost(req, res)
      await waitOneTick();

      // Do assertions
      assert(doc.window.document.querySelector("#error").innerHTML == "password and confirm password must be equal");
      assert.equal(false, doc.window.document.querySelector("#username").classList.contains('is-invalid'));
      assert.equal(false, doc.window.document.querySelector("#password").classList.contains('is-invalid'));
      assert.equal(false, doc.window.document.querySelector("#confirm_password").classList.contains('is-invalid'));
      assert.equal('petrus', doc.window.document.querySelector("#username").value);
      assert.equal('pass', doc.window.document.querySelector("#password").value);
      assert.equal('pass2', doc.window.document.querySelector("#confirm_password").value);
    });

    it('successfully create a new user', async () => {
      // Prepare the mock request
      const req = mockRequest({ db: database, models: { user }, body: {
        name: 'petrus', username: 'petrus', password: 'pass', confirm_password: 'pass' 
      }, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        // Do assertions
        assert.equal('/admin/login', url);
      }});

      // Execute the indexGet
      await createPost(req, res)
      await waitOneTick();

      // Do assertions
      const doc = await user.findOneByUsername('petrus');
      assert.equal('petrus', doc.name);
      assert.equal('petrus', doc.username);
      assert(doc.password);
      assert(doc.createdOn);
    });
  });
});