const assert = require('assert');
const { MongoClient, ObjectId } = require('mongodb');
const { Pub } = require('../../../lib/models/pub');
const circleToPolygon = require('circle-to-polygon');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var pub = null;

describe("Pub Model", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    pub = new Pub(database.collection('pubs'));
    // Clear out the pubs collection
    await database.collection('pubs').deleteMany({});
    // Create a 2dsphere index
    await pub.createIndexes();
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe('create', async () => {

    it('successfully create a new pub', async () => {
      const pubId = ObjectId();
      const errors = await pub.create(
        pubId, 'name', { type: 'Point', coordinates: [51.1, -0.10] }, 'street', '13', 'N13LG', 'London', {}
      );

      // Grab the user doc
      const doc = await database.collection('pubs').findOne({
        _id: pubId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(null, doc);
      assert.equal('name', doc.name);
      assert.deepEqual({ type: 'Point', coordinates: [51.1, -0.10] }, doc.geometry);
      assert.equal('street', doc.street);
      assert.equal('13', doc.housenumber);
      assert.equal('N13LG', doc.postcode);
      assert.equal('London', doc.city);
      assert(doc.createdOn instanceof Date);
    });

    it('fail to create a new postcode due to parameters being null', async () => {
      const errors = await pub.create(
        null, null, {}, null, null, null, null, {}
      );
      
      // Do assertions
      assert.equal(3, Object.keys(errors).length);
      assert.equal('id cannot be null', errors.id);
      assert.equal('name cannot be blank', errors.name);
      assert.equal('geometry cannot be empty', errors.geometry);
    });

    it('fail to create a new postcode due to geometry being illegal GeoJSON instance', async () => {
      const errors = await pub.create(
        new ObjectId(), 'ma pub', { typ: 'Point', coordinates: [] }, null, null, null, null, {}
      );
      
      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('geometry parameter is not a valid GeoJSON object instance', errors.geometry);
    });
  });

  describe('findBy', async () => {

    it('findByWithin', async () => {
      const pubId = ObjectId();
      const center = [58.1, -0.60];
      const errors = await pub.create(
        pubId, 'name', { type: 'Point', coordinates: center }, null, null, null, null, null
      );

      // Generate a polygon circle for within query
      let polygon = circleToPolygon(center, 1000, 32)

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const docs = await pub.findByWithin(polygon);

      // Do assertions
      assert.equal(1, docs.length);
      assert.notEqual(null, docs[0]);
      assert.equal('name', docs[0].name);
      assert.deepEqual(pubId, docs[0]._id);
    });

    it('findByNearSphere with no pubIds filter', async () => {
      const pubId = ObjectId();
      const center = [59.1, -0.80];
      const errors = await pub.create(
        pubId, 'name', { type: 'Point', coordinates: center }, null, null, null, null, {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const docs = await pub.findByNearSphere(center, 1000);

      // Do assertions
      assert.equal(1, docs.length);
      assert.notEqual(null, docs[0]);
      assert.deepEqual(pubId, docs[0]._id);
      assert.equal('name', docs[0].name);
    });

    it('findByNearSphere with pubId filter', async () => {
      const pubId = ObjectId();
      const center = [61.1, -0.90];
      const errors = await pub.create(
        pubId, 'name', { type: 'Point', coordinates: center }, null, null, null, null, {}
      );

      const pubId2 = ObjectId();
      const center2 = [61.1001, -0.9001];
      const errors2 = await pub.create(
        pubId2, 'name', { type: 'Point', coordinates: center2 }, null, null, null, null, {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.equal(0, Object.keys(errors2).length);

      // Get the document
      const docs = await pub.findByNearSphere(center, 1000, [pubId2]);

      // Do assertions
      assert.equal(1, docs.length);
      assert.notEqual(null, docs[0]);
      assert.deepEqual(pubId2, docs[0]._id);
      assert.equal('name', docs[0].name);
    });

  });
});