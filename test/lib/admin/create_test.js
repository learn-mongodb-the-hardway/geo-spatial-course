const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;

// Routes
const { createGet, createPost } = require('../../../lib/admin/routes/create');

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../../token.txt`, 'utf8');
}

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
      // Prepare the mock request
      const req = mockRequest({ db: database, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {}});

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#username"));
        assert.notEqual(null, doc.window.document.querySelector("#password"));
        assert.notEqual(null, doc.window.document.querySelector("#confirm_password"));
      }});

      // Execute the indexGet
      await createGet(req, res)
    });
  });

  describe("post", async () => {

    it('all fields are null', async () => {
      // Prepare the mock request
      const req = mockRequest({ db: database, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {}});

        // console.log(doc.serialize())

        // Do assertions
        assert.equal(true, doc.window.document.querySelector("#username").classList.contains('is-invalid'));
        assert.equal(true, doc.window.document.querySelector("#password").classList.contains('is-invalid'));
        assert.equal(true, doc.window.document.querySelector("#confirm_password").classList.contains('is-invalid'));
      }});

      // Execute the indexGet
      await createPost(req, res)
    });

    it('password and confirm_password not equal', async () => {
      // Prepare the mock request
      const req = mockRequest({ db: database, body: {
        username: 'petrus', password: 'pass', confirm_password: 'pass2' 
      }, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {}});

        // console.log(doc.serialize())

        // Do assertions
        assert(doc.window.document.querySelector("#error").innerHTML == "password and confirm password must be equal");
        assert.equal(false, doc.window.document.querySelector("#username").classList.contains('is-invalid'));
        assert.equal(false, doc.window.document.querySelector("#password").classList.contains('is-invalid'));
        assert.equal(false, doc.window.document.querySelector("#confirm_password").classList.contains('is-invalid'));
        assert.equal('petrus', doc.window.document.querySelector("#username").value);
        assert.equal('pass', doc.window.document.querySelector("#password").value);
        assert.equal('pass2', doc.window.document.querySelector("#confirm_password").value);
      }});

      // Execute the indexGet
      await createPost(req, res)
    });

    it('successfully create a new user', async () => {
      // Prepare the mock request
      const req = mockRequest({ db: database, body: {
        username: 'petrus', password: 'pass', confirm_password: 'pass' 
      }, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
        // Do assertions
        assert.equal('/admin/login', url);
      }});

      // Execute the indexGet
      await createPost(req, res)

      // Assert the user got created
      const doc = await user.findByUsername('petrus');
      assert.equal('petrus', doc.username);
      assert(doc.password);
      assert(doc.createdOn);
    });
  });
});