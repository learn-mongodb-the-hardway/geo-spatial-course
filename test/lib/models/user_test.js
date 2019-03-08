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

describe("User Model", () => {
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

  describe("create", async () => {

    it('successfully create a new user', async () => {
      const userId = ObjectId();
      const errors = await user.create(
        userId, 'peter', 'peter', 'peter', 'peter', {}
      );

      // Grab the user doc
      const doc = await database.collection('users').findOne({
        _id: userId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(null, doc);
      assert.equal('peter', doc.name);
      assert.equal('peter', doc.username);
      assert.notEqual(null, doc.password);
      assert.notEqual(null, doc.createdOn);
    });


    it('fail due to no field values passed', async () => {
      const userId = ObjectId();
      const errors = await user.create(
        userId, null, null, null, null, {}
      );

      // // Grab the user doc
      // const doc = await database.collection('users').findOne({
      //   _id: userId
      // });

      // Do assertions
      assert.notEqual(0, Object.keys(errors).length);
      console.dir(errors)
      // assert.notEqual(null, doc);
      // assert.equal('peter', doc.name);
      // assert.equal('peter', doc.username);
      // assert.notEqual(null, doc.password);
      // assert.notEqual(null, doc.createdOn);
    });
  });

});