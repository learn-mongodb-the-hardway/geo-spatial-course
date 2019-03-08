const assert = require('assert');
const { MongoClient, ObjectId } = require('mongodb');
const { PostCode } = require('../../../lib/models/postcode');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var postcode = null;

describe("Postcode Model", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.dropDatabase();
    postcode = new PostCode(database.collection('postcodes'));
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe('create', async () => {

    it('successfully create a new postcode', async () => {
      const postcodeId = ObjectId();
      const errors = await postcode.create(
        postcodeId, 'name', 'description', { coordinates: [] }, {}
      );

      // Grab the user doc
      const doc = await database.collection('postcodes').findOne({
        _id: postcodeId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(null, doc);
      assert.equal('name', doc.name);
      assert.equal('description', doc.description);
      assert.deepEqual({ coordinates: [] }, doc.geometry);
    });

    it('fail to create a new postcode due to parameters being null', async () => {
      const postcodeId = ObjectId();
      const errors = await postcode.create(
        postcodeId, null, null, null, {}
      );

      // Do assertions
      assert.equal(3, Object.keys(errors).length);
      assert.equal('name cannot be blank', errors.name);
      assert.equal('description cannot be blank', errors.description);
      assert.equal('geometry cannot be empty', errors.geometry);
    });

  });

  describe('findBy', async () => {

    it('findOneByName', async () => {
      const postcodeId = ObjectId();
      const errors = await postcode.create(
        postcodeId, 'name2', 'description', { coordinates: [] }, {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const doc = await postcode.findOneByName('name2');

      assert.notEqual(null, doc);
      assert.equal('name2', doc.name);
    });

  });
});