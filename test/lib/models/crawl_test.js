const assert = require('assert');
const { MongoClient, ObjectId } = require('mongodb');
const { Crawl } = require('../../../lib/models/crawl');
const { Pub } = require('../../../lib/models/pub');
const { User } = require('../../../lib/models/user');
const circleToPolygon = require('circle-to-polygon');
const { doesNotContainFields, containFields } = require('../utils');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var crawl = null;
var pub = null;
var user = null;

describe("Crawl Model", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    crawl = new Crawl(database.collection('crawls'));
    pub = new Pub(database.collection('pubs'));
    user = new User(database.collection('users'));
    // Delete documents
    await database.collection('crawls').deleteMany({});
    await database.collection('pubs').deleteMany({});
    await database.collection('users').deleteMany({});
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
      assert(doc.createdOn instanceof Date);
    });

    it('fail to create a new pub crawl due to parameters being null', async () => {
      const errors = await crawl.create(
        null, null, null, null, null, null, null, null, {}
      );
      
      // Do assertions
      assert.equal(6, Object.keys(errors).length);
      assert.equal('id cannot be null', errors.id);
      assert.equal('name cannot be null or empty', errors.name);
      assert.equal('description cannot be null or empty', errors.description);
      assert.equal('username cannot be null or empty', errors.username);
      assert.equal('start date cannot be null or empty', errors.fromdate);
      assert.equal('end date cannot be null or empty', errors.todate);
    });

    it('fail to create a new pub crawl due to from date > to date', async () => {
      const errors = await crawl.create(
        ObjectId(), 'name', 'description', 'username', new Date(new Date().getTime() + 20000), new Date(), null, null, null
      );
      
      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('end date must be after start date', errors.error);
    });
  });

  describe('findBy', async () => {

    it('findIntersectWithPointAndDates', async () => {
      const center = [61, 0.15];
      const locationPolygon = circleToPolygon(center, 1000);

      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          location: {
            polygon: locationPolygon
          }
        }
      );

      // Attempt to locate
      const docs = await crawl.findIntersectWithPointAndDates(center, new Date(currentTimeMS + 5000));

      // Assertions
      assert.equal(1, docs.length);
      assert.deepEqual(crawlId, docs[0]._id);
    });

    it('findOneById', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {}
      );

      // Get the document
      const doc = await crawl.findOneById(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual(crawlId, doc._id);
    });

    it('findByUsername', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      await crawl.create(
        crawlId, 'name', 'description', 'username10', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {}
      );

      // Get the document
      const docs = await crawl.findByUsername('username10');

      // Assertions
      assert.equal(1, docs.length);
      assert.deepEqual(crawlId, docs[0]._id);
    });

    it('findOneByIdAndDates', async () => {
      const crawlId = ObjectId();
      const pubId = ObjectId();
      const currentTimeMS = new Date().getTime();
      await crawl.create(
        crawlId, 'name', 'description', 'username10', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [pubId]);

      await pub.create(
        pubId, 'name', { type: 'Point', coordinates: [51.1, -0.10] }
      );

      // Get the document
      const doc = await crawl.findOneByIdAndDates(crawlId, new Date(currentTimeMS + 10000));

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual(crawlId, doc._id);
      assert.equal(1, doc.pubs.length);
      assert(containFields(doc.pubs[0], ['_id', 'name', 'geometry', 'street', 'housenumber', 'postcode', 'city', 'createdOn']))
    });

    it('findOneByIdFull', async () => {
      const crawlId = ObjectId();
      const pubId = ObjectId();
      const currentTimeMS = new Date().getTime();
      await crawl.create(
        crawlId, 'name', 'description', 'username10', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          pubs: [pubId]
        }
      );

      await pub.create(
        pubId, 'name', { type: 'Point', coordinates: [51.1, -0.10] }, null, null, null, null, {}
      );

      // Get the document
      const doc = await crawl.findOneByIdFull(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual(crawlId, doc._id);
      assert.equal(1, doc.pubs.length);
      assert(containFields(doc.pubs[0], ['_id', 'name', 'geometry', 'street', 'housenumber', 'postcode', 'city', 'createdOn']))
    });

    it('findOneByIdWithAttendants', async () => {
      const crawlId = ObjectId();
      const userId = ObjectId();
      const currentTimeMS = new Date().getTime();
      await crawl.create(
        crawlId, 'name', 'description', 'username20', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          attendants: [userId]
        }
      );

      await user.create(
        userId, 'peter', 'username20', 'peter', 'peter', {}
      );

      // Get the document
      const doc = await crawl.findOneByIdWithAttendants(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual(crawlId, doc._id);
      assert.equal(1, doc.attendants.length);
      assert(containFields(doc.attendants[0], ['_id', 'name', 'username', 'password', 'createdOn']))
    });

    it('findOneByIdAttendantLocations', async () => {
      const crawlId = ObjectId();
      const userId = ObjectId();
      const userId2 = ObjectId();
      const currentTimeMS = new Date().getTime();
      
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username200', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          attendants: [userId, userId2]
        }
      );

      assert.equal(0, Object.keys(errors).length);

      errors = await user.create(
        userId, 'peter', 'username200', 'peter', 'peter', {
          location: {
            type: 'Point', coordinates: [51.1, 10.1]
          }
        }
      );

      assert.equal(0, Object.keys(errors).length);

      errors = await user.create(
        userId2, 'peter2', 'username300', 'peter2', 'peter2', {
          location: {
            type: 'Point', coordinates: [51.1, 10.1]
          }
        }
      );

      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const doc = await crawl.findOneByIdAttendantLocations(crawlId, userId2);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual(crawlId, doc._id);
      assert.equal(1, doc.locations.length);
      assert(containFields(doc, ['_id', 'locations']))
      assert(containFields(doc.locations[0], ['_id', 'name', 'location']))
      assert.deepEqual(userId, doc.locations[0]._id);
    });
  });

  describe('update', async () => {

    it('correctly update document', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000)
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

    it('fail validation due to illegal values', async () => {
      // Attempt to update pub crawl
      var errors = await crawl.update(
        ObjectId(), '', '', '', ''
      );

      // Do assertions
      assert.equal(4, Object.keys(errors).length);
      assert.equal('name must be a valid string or null', errors.name);
      assert.equal('description must be a valid string or null', errors.description);
      assert.equal('start date must be a valid date or null', errors.fromdate);
      assert.equal('end date must be a valid date or null', errors.todate);
    });

    it('fail to update due to from date > to date', async () => {
      var currentTimeMS = new Date().getTime();
      // Attempt to update pub crawl
      var errors = await crawl.update(
        ObjectId(), 'name2', 'description2', new Date(currentTimeMS + 20000), new Date(currentTimeMS)
      );

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('end date must be after start date', errors.error);
    });

    it('fail to update due to missing crawl', async () => {
      // Attempt to update pub crawl
      var errors = await crawl.update(
        ObjectId(), 'name2', 'description2'
      );

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.notEqual(-1, errors.error.indexOf('the crawl with id'));
    });
  });

  describe('publish', async () => {

    it('correctly publish crawl', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), false, [], {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to publish
      const result = await crawl.publish(crawlId);

      // Grab the document
      const doc = await database.collection('crawls').findOne({
        _id: crawlId
      });

      // Assertions
      assert.equal(1, result.matchedCount);
      assert.notEqual(null, doc);
      assert.equal(true, doc.published);
    });
  });

  describe('unpublish', async () => {

    it('correctly unpublish crawl', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to unpublish
      const result = await crawl.unpublish(crawlId);

      // Grab the document
      const doc = await database.collection('crawls').findOne({
        _id: crawlId
      });

      // Assertions
      assert.equal(1, result.matchedCount);
      assert.equal(false, doc.published);
    });

  });

  describe('updateLocation', async () => {

    it('successfully update Location object', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Create a new set of geo spatial coordinates
      const center = [71, 0.35];
      const locationPolygon = circleToPolygon(center, 1000);

      // Attempt to update
      const result = await crawl.updateLocation(crawlId, {
        polygon: locationPolygon
      });

      // Assertions
      assert.equal(1, result.matchedCount);

      // Get document
      const docs = await crawl.findIntersectWithPointAndDates(center, new Date(currentTimeMS + 5000));

      // Assertions
      assert.equal(1, docs.length);
      assert.deepEqual(crawlId, docs[0]._id);
    });

    it('fail to update Location object due to not valid object', async () => {
      try {
        await crawl.updateLocation(new ObjectId(), {
          polygon: null
        });  

        assert(false);
      } catch (error) {
        assert.equal('location.polygon cannot be null', error.message);
      }
    });
  });

  describe('updateSearchLocations', async () => {

    it('successfully update search location object', async () => {
      const crawlId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to update
      const result = await crawl.updateSearchLocations(crawlId, [{
        center: [], geometry: {}
      }], 500);

      // Assertions
      assert.equal(1, result.matchedCount);

      // Get document
      const doc = await crawl.findOneById(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.equal(1, doc.searchLocations.length);
      assert.deepEqual({ center: [], geometry: {} }, doc.searchLocations[0]);
      assert.equal(500, doc.locationDistance);
    });

    it('fail update search location object due to illegal values', async () => {
      try {
        await crawl.updateSearchLocations(new ObjectId(), [{
          center: []
        }], 500);
        
        assert(false);
      } catch (err) {
        assert.equal('location.geometry cannot be null', err.message);
      }

      try {
        await crawl.updateSearchLocations(new ObjectId(), [{
          geometry: {}
        }], 500);
        
        assert(false);
      } catch (err) {
        assert.equal('location.center cannot be null', err.message);
      }
    });
  });

  describe('addUserToPubs', async () => {

    it('successfully add user to pubs in crawl', async () => {
      const crawlId = ObjectId();
      const userId = ObjectId();
      const pubId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          pubs: [pubId]
        }
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to add user to crawl
      const result = await crawl.addUserToPubs(crawlId, userId, [pubId]);

      // Assertions
      assert.equal(1, result.matchedCount);

      // Get crawl
      const doc = await crawl.findOneById(crawlId);

      // Check in marks
      const checkInMarks = {};
      checkInMarks[pubId.toString()] = [userId];

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual(checkInMarks, doc.attendants_location);
    });

    it('should fail due to empty pub list passed', async () => {
      await assert.rejects(async() => {
        await crawl.addUserToPubs(new ObjectId(), new ObjectId(), []);
      }, new Error('pubIds parameter cannot be empty'));
    });

  });

  describe('removeUserFromPubs', async () => {

    it('successfully remove user from pubs in crawl', async () => {
      const crawlId = ObjectId();
      const userId = ObjectId();
      const pubId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          pubs: [pubId]
        }
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to add user to crawl
      var result = await crawl.addUserToPubs(crawlId, userId, [pubId]);

      // Assertions
      assert.equal(1, result.matchedCount);

      // Remove the user
      result = await crawl.removeUserFromPubs(crawlId, userId);

      // Attempt to publish
      const doc = await crawl.findOneById(crawlId);

      // Check in marks
      const checkInMarks = {};
      checkInMarks[pubId.toString()] = [];

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual(checkInMarks, doc.attendants_location);
    });

    it('fail removeUserFromPubs due to missing pub crawl doc', async () => {
      await assert.rejects(async() => {
        await crawl.removeUserFromPubs(new ObjectId(), new ObjectId(), []);
      }, (error) => {
        return error.message.indexOf('could not locate pub crawl with id') != -1;
      });
    });

  });

  describe('addAttendant', async () => {

    it('successfully addAttendant', async () => {
      const crawlId = ObjectId();
      const userId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to add user to crawl
      var result = await crawl.addAttendant(crawlId, userId);

      // Assertions
      assert.equal(1, result.matchedCount);

      // Attempt to publish
      const doc = await crawl.findOneById(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual([userId], doc.attendants);
    });

  });

  describe('removeAttendant', async () => {

    it('successfully removeAttendant', async () => {
      const crawlId = ObjectId();
      const userId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          attendants: [userId]
        }
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to add user to crawl
      var result = await crawl.removeAttendant(crawlId, userId);

      // Assertions
      assert.equal(1, result.matchedCount);

      // Attempt to publish
      const doc = await crawl.findOneById(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual([], doc.attendants);
    });

  });

  describe('addPub', async () => {

    it('successfully add a pub', async () => {
      const crawlId = ObjectId();
      const pubId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to add pub to crawl
      var result = await crawl.addPub(crawlId, pubId);
      assert.equal(1, result.matchedCount);

      // Attempt to publish
      const doc = await crawl.findOneById(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual([pubId], doc.pubs);
    });

  });

  describe('removePub', async () => {

    it('successfully remove a pub', async () => {
      const crawlId = ObjectId();
      const pubId = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          pubs: [pubId]
        }
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to remove pub from crawl
      var result = await crawl.removePub(crawlId, pubId);
      assert.equal(1, result.matchedCount);

      // Attempt to publish
      const doc = await crawl.findOneById(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual([], doc.pubs);
    });

  });

  describe('movePubUp', async () => {

    it('successfully move a pub up', async () => {
      const crawlId = ObjectId();
      const pubId = ObjectId();
      const pubId2 = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          pubs: [pubId, pubId2]
        }
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to remove pub from crawl
      var result = await crawl.movePubUp(crawlId, pubId2);
      assert.equal(1, result.matchedCount);

      // Attempt to publish
      const doc = await crawl.findOneById(crawlId);

      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual([pubId2, pubId], doc.pubs);
    });

    it('do not change order as pubId is already first', async () => {
      const crawlId = ObjectId();
      const pubId = ObjectId();
      const pubId2 = ObjectId();
      const currentTimeMS = new Date().getTime();
      var errors = await crawl.create(
        crawlId, 'name', 'description', 'username', new Date(currentTimeMS), new Date(currentTimeMS + 20000), true, [], {
          pubs: [pubId, pubId2]
        }
      );
  
      // Do assertions
      assert.equal(0, Object.keys(errors).length);
  
      // Attempt to remove pub from crawl
      var result = await crawl.movePubUp(crawlId, pubId);
      assert.equal(1, result.matchedCount);

      // Attempt to publish
      const doc = await crawl.findOneById(crawlId);
  
      // Assertions
      assert.notEqual(null, doc);
      assert.deepEqual([pubId, pubId2], doc.pubs);
    });
  
    it('fail to moveUp as the pub crawl id does not exist', async () => {
      await assert.rejects(async() => {
        await crawl.movePubUp(new ObjectId(), new ObjectId());
      }, (error) => {
        return error.message.indexOf('could not locate pub crawl with id') != -1;
      });
    });

  });

});