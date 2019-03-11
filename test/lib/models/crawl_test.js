const assert = require('assert');
const { MongoClient, ObjectId } = require('mongodb');
const { Crawl } = require('../../../lib/models/crawl');
const circleToPolygon = require('circle-to-polygon');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var crawl = null;

describe("Crawl Model", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.dropDatabase();
    crawl = new Crawl(database.collection('crawls'));
    // Create a 2dsphere index
    await crawl.createIndexes();
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe('create', async () => {

    it('successfully create a new crawl', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      const errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 2000), false, [], {}
      );

      // Grab the user doc
      const doc = await database.collection('crawls').findOne({
        _id: crawlId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(null, doc);
      assert.equal('name', doc.name);
      assert.equal('description', doc.description);
      assert.equal('username', doc.username);
      assert.equal(new Date(currentTimeMS).toString(), doc.from.toString());
      assert.equal(new Date(currentTimeMS + 2000).toString(), doc.to.toString());
      assert.equal(false, doc.published);
      assert.deepEqual([], doc.pubs);
      assert.notEqual(null, doc.createdOn);
    });

    it('fail to create a new pub crawl due to parameters being null', async () => {
      const crawlId = ObjectId();
      const errors = await crawl.create(
        crawlId, null, null, null, null, null, null, null, {}
      );
      
      // Do assertions
      assert.equal(5, Object.keys(errors).length);
      assert.equal('name cannot be null or empty', errors.name);
      assert.equal('description cannot be null or empty', errors.description);
      assert.equal('username cannot be null or empty', errors.username);
      assert.equal('start date cannot be null or empty', errors.fromdate);
      assert.equal('end date cannot be null or empty', errors.todate);
    });

    it('fail to create a new pub crawl due to from date > to date', async () => {
      const crawlId = ObjectId();
      const time = new Date().getTime();
      const errors = await crawl.create(
        crawlId, null, null, null, new Date(time + 20000), new Date(), null, null, {}
      );
      
      // Do assertions
      assert.equal(4, Object.keys(errors).length);
      assert.equal('name cannot be null or empty', errors.name);
      assert.equal('description cannot be null or empty', errors.description);
      assert.equal('username cannot be null or empty', errors.username);
      assert.equal('end date must be after start date', errors.error);
    });
  });

  describe('update', async () => {

    it('correctly update document', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), false, [], {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to update pub crawl
      errors = await crawl.update(
        crawlId, 'name2', 'description2', new Date(currentTimeMS + 20000), new Date(currentTimeMS + 40000)
      );

      // Grab the user doc
      const doc = await database.collection('crawls').findOne({
        _id: crawlId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(null, doc);
      assert.equal('name2', doc.name);
      assert.equal('description2', doc.description);
      assert.equal(new Date(currentTimeMS + 20000).toString(), doc.from.toString());
      assert.equal(new Date(currentTimeMS + 40000).toString(), doc.to.toString());
    });
  });

  // describe('findBy', async () => {

  //   it('findByWithin', async () => {
  //     const pubId = ObjectId();
  //     const center = [58.1, -0.60];
  //     const errors = await pub.create(
  //       pubId, 'name', { type: 'Point', coordinates: center }, null, null, null, null, {}
  //     );

  //     // Generate a polygon circle for within query
  //     let polygon = circleToPolygon(center, 1000, 32)

  //     // Do assertions
  //     assert.equal(0, Object.keys(errors).length);

  //     // Get the document
  //     const docs = await pub.findByWithin(polygon);

  //     // Do assertions
  //     assert.equal(1, docs.length);
  //     assert.notEqual(null, docs[0]);
  //     assert.equal('name', docs[0].name);
  //   });

  //   it('findByNearSphere with no pubIds filter', async () => {
  //     const pubId = ObjectId();
  //     const center = [59.1, -0.80];
  //     const errors = await pub.create(
  //       pubId, 'name', { type: 'Point', coordinates: center }, null, null, null, null, {}
  //     );

  //     // Do assertions
  //     assert.equal(0, Object.keys(errors).length);

  //     // Get the document
  //     const docs = await pub.findByNearSphere(center, 1000);

  //     // Do assertions
  //     assert.equal(1, docs.length);
  //     assert.notEqual(null, docs[0]);
  //     assert.equal('name', docs[0].name);
  //   });

  //   it('findByNearSphere with pubId filter', async () => {
  //     const pubId = ObjectId();
  //     const center = [61.1, -0.90];
  //     const errors = await pub.create(
  //       pubId, 'name', { type: 'Point', coordinates: center }, null, null, null, null, {}
  //     );

  //     const pubId2 = ObjectId();
  //     const center2 = [61.15, -0.95];
  //     const errors2 = await pub.create(
  //       pubId2, 'name', { type: 'Point', coordinates: center2 }, null, null, null, null, {}
  //     );

  //     // Do assertions
  //     assert.equal(0, Object.keys(errors).length);
  //     assert.equal(0, Object.keys(errors2).length);

  //     // Get the document
  //     const docs = await pub.findByNearSphere(center, 1000, [pubId]);

  //     // Do assertions
  //     assert.equal(1, docs.length);
  //     assert.notEqual(null, docs[0]);
  //     assert.equal('name', docs[0].name);
  //   });

  // });
});