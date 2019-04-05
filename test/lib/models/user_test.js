const assert = require('assert');
const faker = require('faker');
const { MongoClient, ObjectId } = require('mongodb');
const { User } = require('../../../lib/models/user');

// Check if env has been set
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;

describe("User Model", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.collection('users').deleteMany({});
    user = new User(database.collection('users'));
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe('create', async () => {

    it('successfully create a new user', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      const errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Grab the user doc
      const doc = await database.collection('users').findOne({
        _id: userId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(null, doc);
      assert.equal('peter', doc.name);
      assert.equal(userName, doc.username);
      assert.notEqual(null, doc.password);
      assert.notEqual('peter', doc.password);
      assert(doc.createdOn instanceof Date);
    });


    it('fail due to no field values passed', async () => {
      const errors = await user.create(
        null, null, null, null, null, {}
      );

      // Do assertions
      assert.equal(5, Object.keys(errors).length);
      assert.equal('id cannot be null', errors.id);
      assert.equal('name cannot be blank', errors['name']);
      assert.equal('username cannot be blank', errors['username']);
      assert.equal('password cannot be blank', errors['password']);
      assert.equal('confirmPassword cannot be blank', errors['confirm_password']);
    });

    it('password do not match', async () => {
      const errors = await user.create(
        new ObjectId(), 'peter', 'peter', 'peter', 'peter2', {}
      );

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('password and confirm password must be equal', errors['error']);
    });

    it('user already exists', async () => {
      const userName = faker.internet.userName();
      var errors = await user.create(
        new ObjectId(), 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      errors = await user.create(
        new ObjectId(), 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal(`user ${userName} already exists`, errors['error']);
    });
  });

  describe('changePassword', async () => {

    it('correctly change password', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Grab the user doc
      const beforeDoc = await database.collection('users').findOne({
        _id: userId
      });

      // Attempt to change the user password
      errors = await user.changePassword(userId, 'peter', 'peter2', 'peter2');

      // Grab the user doc
      const afterDoc = await database.collection('users').findOne({
        _id: userId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(beforeDoc.password, afterDoc.password);
    });

    it('should fail due to parameters being null', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to change the user password
      errors = await user.changePassword(null, null, null, null);

      // Do assertions
      assert.equal(4, Object.keys(errors).length);
      assert.equal('id cannot be null', errors['id']);
      assert.equal('currentPassword cannot be blank', errors['current_password']);
      assert.equal('password cannot be blank', errors['password']);
      assert.equal('confirmPassword cannot be blank', errors['confirm_password']);
    });

    it('should fail due to mismatched new passwords', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to change the user password
      errors = await user.changePassword(userId, 'peter', 'peter1', 'peter2');

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('password and confirm password must be equal', errors['error']);
    });

    it('should fail due to wrong existing password', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to change the user password
      errors = await user.changePassword(userId, 'peter1', 'peter2', 'peter2');

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('User does not exist or current password entered is wrong', errors['error']);
    });

  });

  describe('updateLocation', async () => {

    it('should set location object', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Set a new location (fake one)
      await user.updateLocation(userId, { type: 'Point', coordinates: [50.1, 10.1] });

      // Get the document
      const doc = await database.collection('users').findOne({
        _id: userId
      });

      assert.deepEqual({ type: 'Point', coordinates: [50.1, 10.1] }, doc.location);
      assert.notEqual(null, doc.updatedOn);
    });

    it('should fail to updateLocation called with illegal parameters', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);


      assert.rejects(async () => {
        await user.updateLocation(null, null);
      }, new Error('id parameter cannot be null'));
      
      assert.rejects(async () => {
        await user.updateLocation(userId, null);
      }, new Error('location parameter cannot be null'));

      assert.rejects(async () => {
        await user.updateLocation(userId, { typ: 'Point', coordinates: [50.1, 10.1] });
      }, new Error('location parameter is not a valid GeoJSON object instance'));
    });

  });

  describe('findBy', async () => {

    it('findById', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const doc = await user.findById(userId);

      assert.notEqual(null, doc);
      assert.equal(userName, doc.username);
    });

    it('findByUsername', async () => {
      const userId = ObjectId();
      const userName = faker.internet.userName();
      var errors = await user.create(
        userId, 'peter', userName, 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const doc = await user.findOneByUsername(userName);

      assert.notEqual(null, doc);
      assert.equal(userName, doc.username);
    });
  });
});