const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const { Pub } = require('../../../lib/models/pub');
const { Crawl } = require('../../../lib/models/crawl');

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;
var crawl = null;
var pub = null;

// Routes
const { pubAddPost, pubDeleteGet, pubFindPost, pubMoveupGet } = require('../../../lib/admin/routes/crawls/pub');

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../../token.txt`, 'utf8');
}

describe("/crawls/pub Routes", () => {
  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.dropDatabase();
    user = new User(database.collection('users'));
    crawl = new Crawl(database.collection('crawls'));
    pub = new Pub(database.collection('pubs'));
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("/crawls/pub/add", async () => {

    it('should not add pub due to pub not found', async () => {
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {
        _id: ObjectId().toString()
      }, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result);

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#pubInCrawlTable"));
      }});

      // Execute the indexGet
      await pubAddPost(req, res)
    });

    it('should add pub to crawl', async () => {
      const crawlId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
    
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {
        _id: pubId.toString()
      }, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result);

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#pubInCrawlTable"));
        assert(result.indexOf('/admin/crawls/pub/delete') != -1)
      }});

      // Execute the indexGet
      await pubAddPost(req, res)

      // Locate the crawl
      const doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.pubs)
      assert.deepEqual([pubId], doc.pubs);
    });
  });

  describe("/crawls/pub/delete", async () => {
    it('should delete pub to crawl', async () => {
      const crawlId = ObjectId();
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        pubId
      ], {});
    
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId, pubId: pubId.toString()
      }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result);

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubDeleteGet(req, res)

      // Locate the crawl
      const doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.pubs)
      assert.deepEqual([], doc.pubs);
    });

    it('should not find pub to delete', async () => {
      const crawlId = ObjectId();
      const pubId = ObjectId();
      const currentPubId = ObjectId();
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        currentPubId
      ], {});
    
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId, pubId: pubId.toString()
      }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result);

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubDeleteGet(req, res)

      // Locate the crawl
      const doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.pubs)
      assert.deepEqual([currentPubId], doc.pubs);
    });
  });

  describe("/crawls/pub/moveup", async () => {
    
    it('should move pub up in the order list', async () => {
      const crawlId = ObjectId();
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      const secondPubId = ObjectId();
      const secondPubDoc = {"_id":secondPubId,"name":"The Ship and Shovell","geometry":{"type":"MultiPolygon","coordinates":[[[[-0.124766,51.5076021],[-0.1246849,51.5076631],[-0.1248584,51.507758],[-0.1249074,51.5077181],[-0.1248682,51.5077001],[-0.1248285,51.5076779],[-0.1248623,51.5076516],[-0.124766,51.5076021]]],[[[-0.1247432,51.5075838],[-0.124657,51.5075369],[-0.1246427,51.507547],[-0.1246632,51.5075582],[-0.1246498,51.507569],[-0.1246286,51.5075559],[-0.1246139,51.5075658],[-0.1246552,51.5075872],[-0.1246379,51.5075982],[-0.1246862,51.5076231],[-0.1247432,51.5075838]]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
          // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
      await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        pubId, secondPubId
      ], {});
    
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId, pubId: secondPubId.toString()
      }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result);

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubMoveupGet(req, res)

      // Locate the crawl
      const doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.pubs)
      assert.deepEqual([secondPubId, pubId], doc.pubs);
    });

    it('should not find pub to move up', async () => {
      const crawlId = ObjectId();
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      const secondPubId = ObjectId();
      const secondPubDoc = {"_id":secondPubId,"name":"The Ship and Shovell","geometry":{"type":"MultiPolygon","coordinates":[[[[-0.124766,51.5076021],[-0.1246849,51.5076631],[-0.1248584,51.507758],[-0.1249074,51.5077181],[-0.1248682,51.5077001],[-0.1248285,51.5076779],[-0.1248623,51.5076516],[-0.124766,51.5076021]]],[[[-0.1247432,51.5075838],[-0.124657,51.5075369],[-0.1246427,51.507547],[-0.1246632,51.5075582],[-0.1246498,51.507569],[-0.1246286,51.5075559],[-0.1246139,51.5075658],[-0.1246552,51.5075872],[-0.1246379,51.5075982],[-0.1246862,51.5076231],[-0.1247432,51.5075838]]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
          // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
      await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        pubId, secondPubId
      ], {});
    
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId, pubId: ObjectId()
      }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result);

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubMoveupGet(req, res)

      // Locate the crawl
      const doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.pubs)
      assert.deepEqual([pubId, secondPubId], doc.pubs);
    });

    it('should not change order due to trying to move first pub up', async () => {
      const crawlId = ObjectId();
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      const secondPubId = ObjectId();
      const secondPubDoc = {"_id":secondPubId,"name":"The Ship and Shovell","geometry":{"type":"MultiPolygon","coordinates":[[[[-0.124766,51.5076021],[-0.1246849,51.5076631],[-0.1248584,51.507758],[-0.1249074,51.5077181],[-0.1248682,51.5077001],[-0.1248285,51.5076779],[-0.1248623,51.5076516],[-0.124766,51.5076021]]],[[[-0.1247432,51.5075838],[-0.124657,51.5075369],[-0.1246427,51.507547],[-0.1246632,51.5075582],[-0.1246498,51.507569],[-0.1246286,51.5075559],[-0.1246139,51.5075658],[-0.1246552,51.5075872],[-0.1246379,51.5075982],[-0.1246862,51.5076231],[-0.1247432,51.5075838]]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
          // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
      await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        pubId, secondPubId
      ], {});
    
      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId, pubId: pubId
      }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async function(template, object) {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result);

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubMoveupGet(req, res)

      // Locate the crawl
      const doc = await crawl.findById(crawlId);

      // Assertions
      assert(doc.pubs)
      assert.deepEqual([pubId, secondPubId], doc.pubs);
    });
  });  
});