const assert = require('assert');
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
      const errors = await user.create(
        userId, 'peter', 'peter345', 'peter', 'peter', {}
      );

      // Grab the user doc
      const doc = await database.collection('users').findOne({
        _id: userId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);
      assert.notEqual(null, doc);
      assert.equal('peter', doc.name);
      assert.equal('peter345', doc.username);
      assert.notEqual(null, doc.password);
      assert.notEqual(null, doc.createdOn);
    });


    it('fail due to no field values passed', async () => {
      const userId = ObjectId();
      const errors = await user.create(
        userId, null, null, null, null, {}
      );

      // Do assertions
      assert.equal(4, Object.keys(errors).length);
      assert.equal('name cannot be blank', errors['name']);
      assert.equal('username cannot be blank', errors['username']);
      assert.equal('password cannot be blank', errors['password']);
      assert.equal('confirmPassword cannot be blank', errors['confirm_password']);
    });

    it('password do not match', async () => {
      const userId = ObjectId();
      const errors = await user.create(
        userId, 'peter', 'peter', 'peter', 'peter2', {}
      );

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('password and confirm password must be equal', errors['error']);
    });

    it('user already exists', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter10', 'peter', 'peter', {}
      );
      
      errors = await user.create(
        userId, 'peter', 'peter10', 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('user peter10 already exists', errors['error']);
    });
  });

  describe('changePassword', async () => {

    it('correctly change password', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter20', 'peter', 'peter', {}
      );

      // Grab the user doc
      const beforeDoc = await database.collection('users').findOne({
        _id: userId
      });

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

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

    it('should fail due to wrong existing password', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter30', 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to change the user password
      errors = await user.changePassword(userId, 'peter1', 'peter2', 'peter2');

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('User does not exist or current password entered is wrong', errors['error']);
    });

    it('should fail due to mismatched new passwords', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter40', 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to change the user password
      errors = await user.changePassword(userId, 'peter', 'peter1', 'peter2');

      // Do assertions
      assert.equal(1, Object.keys(errors).length);
      assert.equal('password and confirm password must be equal', errors['error']);
    });

    it('should fail due to fields being null', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter50', 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Attempt to change the user password
      errors = await user.changePassword(userId, null, null, null);

      // console.dir(errors)
      // Do assertions
      assert.equal(3, Object.keys(errors).length);
      assert.equal('currentPassword cannot be blank', errors['current_password']);
      assert.equal('password cannot be blank', errors['password']);
      assert.equal('confirmPassword cannot be blank', errors['confirm_password']);
    });
  });

  describe('updateLocation', async () => {

    it('should set location object', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter100', 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Set a new location (fake one)
      await user.updateLocation(userId, { location: { polygon: {} } });

      // Get the document
      const doc = await database.collection('users').findOne({
        _id: userId
      });

      assert.notEqual(null, doc);
      assert.deepEqual({ location: { polygon: {} } }, doc.location);
      assert.notEqual(null, doc.updatedOn);
    });

  });

  describe('findBy', async () => {

    it('findById', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter110', 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const doc = await user.findById(userId);

      assert.notEqual(null, doc);
      assert.equal('peter110', doc.username);
    });

    it('findByUsername', async () => {
      const userId = ObjectId();
      var errors = await user.create(
        userId, 'peter', 'peter120', 'peter', 'peter', {}
      );

      // Do assertions
      assert.equal(0, Object.keys(errors).length);

      // Get the document
      const doc = await user.findOneByUsername('peter120');

      assert.notEqual(null, doc);
      assert.equal('peter120', doc.username);
    });
  });
});