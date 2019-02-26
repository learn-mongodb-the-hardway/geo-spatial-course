const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { JSDOM } = require("jsdom");
const { User } = require('../../../lib/models/user');
const { Pub } = require('../../../lib/models/pub');
const { Crawl } = require('../../../lib/models/crawl');
const { PostCode } = require('../../../lib/models/postcode');

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var user = null;
var crawl = null;
var pub = null;
var postcode = null;

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
    postcode = new PostCode(database.collection('postcodes'));

    // Create indexes
    await database.collection('pubs').createIndex({ geometry: "2dsphere" });
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

  describe("/crawls/pub/find", async () => {
    
    it('should lookup pubs by address successfully', async () => {
      const crawlId = ObjectId();
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      const secondPubId = ObjectId();
      const secondPubDoc = {"_id":secondPubId,"name":"The Library","geometry":{"type":"Polygon","coordinates":[[[-0.1035345,51.5447115],[-0.1036715,51.5447278],[-0.1037658,51.5447384],[-0.103782,51.5446805],[-0.1035515,51.5446525],[-0.1035345,51.5447115]]]},"street":"Upper Street","housenumber":"235","postcode":"N1 1RU","city":null}
          // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
      await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        pubId, secondPubId
      ], {});
    
      // Result
      var setupOptions = null;

      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {
        address: "N1 1RU"
      }, session: {}, options: {
        accessToken: accessToken
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async (template, object) => {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
          window.$ = function() {
            return {
              datetimepicker: function() {},
              on: function() {}
            }
          }        

          window.AdminClient = function() {
            return {
              setup: function(options) {
                setupOptions = options;
              }
            }
          }
        }});

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubFindPost(req, res)

      // Assertions
      process.nextTick(() => {
        assert(setupOptions);
        assert(setupOptions.searchPubs);
        assert(setupOptions.searchPubs.length > 0);  
      });
    });

    it('should lookup pubs by postcode successfully', async () => {
      const crawlId = ObjectId();
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      const secondPubId = ObjectId();
      const secondPubDoc = {"_id":secondPubId,"name":"The Library","geometry":{"type":"Polygon","coordinates":[[[-0.1035345,51.5447115],[-0.1036715,51.5447278],[-0.1037658,51.5447384],[-0.103782,51.5446805],[-0.1035515,51.5446525],[-0.1035345,51.5447115]]]},"street":"Upper Street","housenumber":"235","postcode":"N1 1RU","city":null}
      const postcodeId = ObjectId();
      const postcodeDoc = {"_id": postcodeId,"geometry":{"type":"Polygon","coordinates":[[[-0.12203,51.53527],[-0.12241,51.53566],[-0.12319,51.53597],[-0.12304,51.53628],[-0.12317,51.53681],[-0.12325,51.53692],[-0.12479,51.53809],[-0.12576,51.53836],[-0.12379,51.5396],[-0.12349,51.54024],[-0.1235,51.54077],[-0.12301,51.54108],[-0.1228,51.54136],[-0.12213,51.54189],[-0.1212,51.54177],[-0.12093,51.54177],[-0.12086,51.5418],[-0.11937,51.54204],[-0.11919,51.54218],[-0.11869,51.54223],[-0.11834,51.54236],[-0.11792,51.54268],[-0.11786,51.54288],[-0.11732,51.54305],[-0.11705,51.54307],[-0.11687,51.54302],[-0.1157,51.54339],[-0.11537,51.54295],[-0.11514,51.54297],[-0.11407,51.54348],[-0.11379,51.54323],[-0.11372,51.54322],[-0.11304,51.54329],[-0.11294,51.54355],[-0.11256,51.54379],[-0.11219,51.54359],[-0.11218,51.54359],[-0.11185,51.54378],[-0.1114,51.54375],[-0.11136,51.54385],[-0.11106,51.54399],[-0.11058,51.54389],[-0.1105,51.54392],[-0.11048,51.54392],[-0.10994,51.54396],[-0.10984,51.5441],[-0.10969,51.54417],[-0.10947,51.54423],[-0.10944,51.54423],[-0.1093,51.54426],[-0.10921,51.54433],[-0.10919,51.54436],[-0.10904,51.54449],[-0.10907,51.54505],[-0.10895,51.54507],[-0.10882,51.54514],[-0.1083,51.54507],[-0.10752,51.54527],[-0.10739,51.54553],[-0.10668,51.54568],[-0.10657,51.54568],[-0.10617,51.54585],[-0.10593,51.5459],[-0.10558,51.54586],[-0.10474,51.54607],[-0.10471,51.54606],[-0.10406,51.54599],[-0.10387,51.54604],[-0.10327,51.54595],[-0.10288,51.54595],[-0.10296,51.54622],[-0.10269,51.54666],[-0.10263,51.54666],[-0.10202,51.5465],[-0.10197,51.54627],[-0.10144,51.54614],[-0.10131,51.54653],[-0.10143,51.54673],[-0.10115,51.54707],[-0.10103,51.5471],[-0.10026,51.54692],[-0.09914,51.54739],[-0.09872,51.54719],[-0.09826,51.54712],[-0.09802,51.54714],[-0.0975,51.54761],[-0.09675,51.54778],[-0.0961,51.54759],[-0.09578,51.54769],[-0.09573,51.54772],[-0.09543,51.54815],[-0.09419,51.54828],[-0.09411,51.54826],[-0.09332,51.54846],[-0.09325,51.54852],[-0.09217,51.54864],[-0.09173,51.54894],[-0.0912,51.54875],[-0.08987,51.54904],[-0.08984,51.54907],[-0.08939,51.54912],[-0.08877,51.54894],[-0.08804,51.54915],[-0.08794,51.54923],[-0.08801,51.54936],[-0.08708,51.54983],[-0.08738,51.55],[-0.08742,51.55019],[-0.08699,51.55058],[-0.08718,51.55083],[-0.08718,51.55089],[-0.08591,51.55113],[-0.08567,51.55109],[-0.08523,51.55125],[-0.08453,51.5508],[-0.08382,51.55114],[-0.08365,51.55146],[-0.08321,51.55151],[-0.08293,51.55111],[-0.08337,51.5507],[-0.08338,51.55063],[-0.0834,51.55061],[-0.08336,51.5502],[-0.08304,51.5501],[-0.08248,51.55016],[-0.08214,51.55008],[-0.08174,51.55025],[-0.08125,51.55023],[-0.08111,51.5503],[-0.08062,51.55033],[-0.08019,51.55004],[-0.08021,51.5498],[-0.07968,51.54959],[-0.07964,51.54955],[-0.07878,51.54948],[-0.07836,51.54967],[-0.07778,51.54944],[-0.07796,51.54909],[-0.078,51.54907],[-0.07864,51.54894],[-0.07869,51.54881],[-0.07892,51.54864],[-0.07896,51.54849],[-0.07889,51.5484],[-0.07834,51.54811],[-0.07759,51.54819],[-0.07755,51.54817],[-0.07754,51.54756],[-0.07713,51.54739],[-0.07703,51.54703],[-0.07734,51.54688],[-0.07728,51.54654],[-0.07697,51.54645],[-0.0769,51.54602],[-0.0765,51.54615],[-0.07601,51.54603],[-0.07578,51.5459],[-0.07647,51.54573],[-0.07649,51.54553],[-0.07596,51.54532],[-0.07605,51.54497],[-0.07564,51.54453],[-0.07622,51.54448],[-0.07719,51.54391],[-0.07702,51.54384],[-0.07668,51.54304],[-0.07659,51.54302],[-0.07567,51.5424],[-0.07572,51.54237],[-0.07627,51.54216],[-0.07642,51.54198],[-0.07652,51.54108],[-0.07657,51.54106],[-0.07669,51.54092],[-0.07646,51.54039],[-0.07647,51.54036],[-0.07694,51.54003],[-0.07675,51.53976],[-0.07681,51.53968],[-0.07764,51.53945],[-0.07756,51.53911],[-0.07725,51.53899],[-0.07743,51.53853],[-0.07811,51.53842],[-0.07816,51.53806],[-0.07762,51.53791],[-0.07766,51.53748],[-0.07831,51.53707],[-0.07826,51.53705],[-0.07765,51.53703],[-0.07669,51.53668],[-0.07668,51.53666],[-0.07704,51.53638],[-0.07689,51.53611],[-0.07733,51.53586],[-0.07733,51.53571],[-0.07707,51.53561],[-0.07706,51.53558],[-0.0771,51.53533],[-0.07773,51.53525],[-0.07784,51.53517],[-0.07749,51.53493],[-0.07699,51.53491],[-0.07675,51.53466],[-0.07678,51.53451],[-0.07697,51.53444],[-0.07721,51.5345],[-0.07828,51.53422],[-0.07787,51.53377],[-0.07741,51.53369],[-0.07734,51.53365],[-0.07798,51.53291],[-0.07788,51.53285],[-0.07782,51.53237],[-0.07781,51.53236],[-0.07723,51.53234],[-0.07669,51.53208],[-0.07724,51.53149],[-0.07678,51.53106],[-0.07732,51.53066],[-0.07725,51.53037],[-0.0776,51.53027],[-0.07765,51.53008],[-0.07814,51.53003],[-0.07837,51.52981],[-0.07915,51.52966],[-0.07914,51.52945],[-0.07922,51.52931],[-0.07912,51.52878],[-0.07891,51.52854],[-0.07891,51.52842],[-0.07888,51.52838],[-0.07775,51.52826],[-0.0777,51.52815],[-0.07773,51.5281],[-0.07836,51.52779],[-0.07858,51.5278],[-0.0788,51.52788],[-0.07899,51.52782],[-0.07954,51.52744],[-0.07959,51.52744],[-0.07981,51.5274],[-0.08019,51.52735],[-0.0802,51.52735],[-0.0807,51.52737],[-0.08084,51.52713],[-0.08069,51.52695],[-0.0809,51.52683],[-0.08126,51.5269],[-0.08129,51.52694],[-0.08195,51.52711],[-0.08214,51.52705],[-0.0823,51.52696],[-0.08245,51.52698],[-0.0828,51.52691],[-0.08326,51.52699],[-0.08335,51.52675],[-0.08334,51.52654],[-0.08367,51.5265],[-0.08392,51.52633],[-0.08407,51.52634],[-0.08425,51.52686],[-0.08448,51.52687],[-0.08474,51.52639],[-0.08506,51.52632],[-0.08528,51.52635],[-0.08552,51.52657],[-0.08553,51.52675],[-0.08572,51.52686],[-0.08577,51.52734],[-0.08619,51.52753],[-0.08639,51.52736],[-0.08662,51.52731],[-0.08678,51.52717],[-0.08654,51.52687],[-0.08701,51.52684],[-0.08707,51.52705],[-0.08741,51.52718],[-0.08778,51.52682],[-0.08798,51.52681],[-0.08809,51.52688],[-0.0883,51.5271],[-0.0883,51.52731],[-0.08762,51.5276],[-0.08766,51.52781],[-0.08895,51.52787],[-0.08919,51.52777],[-0.08955,51.52779],[-0.0897,51.52783],[-0.08983,51.52798],[-0.09021,51.52813],[-0.09043,51.52858],[-0.09112,51.52864],[-0.09155,51.52844],[-0.09179,51.52849],[-0.09208,51.52861],[-0.09208,51.52866],[-0.0923,51.52909],[-0.09248,51.52911],[-0.09248,51.52911],[-0.09323,51.52874],[-0.09349,51.52883],[-0.09377,51.52879],[-0.09446,51.52896],[-0.09524,51.52894],[-0.09538,51.52906],[-0.09433,51.52968],[-0.09448,51.52996],[-0.0947,51.53003],[-0.09526,51.52999],[-0.09592,51.52932],[-0.09678,51.52968],[-0.09678,51.53044],[-0.09776,51.53048],[-0.09789,51.53045],[-0.09851,51.53007],[-0.09863,51.5301],[-0.09873,51.53011],[-0.09902,51.53053],[-0.09915,51.53062],[-0.09966,51.53058],[-0.10012,51.53024],[-0.10027,51.53032],[-0.10053,51.53057],[-0.1005,51.53072],[-0.10046,51.53075],[-0.09982,51.53115],[-0.10039,51.53112],[-0.10081,51.53128],[-0.10096,51.53125],[-0.10116,51.53128],[-0.10125,51.53135],[-0.10202,51.53134],[-0.10224,51.53154],[-0.10269,51.53154],[-0.10304,51.53179],[-0.10318,51.53182],[-0.1033,51.53187],[-0.10331,51.53187],[-0.1036,51.53187],[-0.10419,51.5319],[-0.10424,51.53195],[-0.10466,51.53209],[-0.10466,51.53209],[-0.10486,51.53272],[-0.10578,51.53248],[-0.10579,51.53247],[-0.10581,51.5324],[-0.10593,51.53223],[-0.10596,51.53206],[-0.10646,51.53174],[-0.1069,51.53176],[-0.10708,51.5318],[-0.10773,51.53155],[-0.10778,51.5314],[-0.10778,51.53125],[-0.10773,51.53119],[-0.10821,51.53062],[-0.1089,51.53091],[-0.10897,51.53106],[-0.10974,51.53095],[-0.1097,51.53069],[-0.11018,51.53046],[-0.11058,51.53054],[-0.11077,51.53068],[-0.1112,51.5306],[-0.11173,51.53091],[-0.11172,51.53115],[-0.11242,51.53113],[-0.1128,51.53093],[-0.11283,51.53088],[-0.11328,51.53074],[-0.11371,51.53143],[-0.11388,51.5315],[-0.11453,51.53151],[-0.11484,51.53165],[-0.11488,51.53167],[-0.11559,51.5312],[-0.11559,51.53115],[-0.1161,51.53075],[-0.11612,51.53065],[-0.11614,51.53064],[-0.11653,51.53064],[-0.11681,51.53089],[-0.1174,51.53073],[-0.11754,51.53079],[-0.1178,51.53072],[-0.11802,51.53087],[-0.1184,51.53077],[-0.11857,51.53105],[-0.11921,51.53101],[-0.11923,51.53101],[-0.11927,51.53099],[-0.11957,51.53097],[-0.11983,51.53091],[-0.12009,51.53081],[-0.12024,51.53077],[-0.12022,51.53057],[-0.12027,51.53053],[-0.12109,51.53037],[-0.1211,51.53039],[-0.12145,51.53053],[-0.12144,51.5308],[-0.12165,51.53084],[-0.12183,51.53089],[-0.12239,51.53067],[-0.12256,51.53073],[-0.12278,51.53077],[-0.12338,51.53158],[-0.12304,51.53169],[-0.12251,51.53193],[-0.12247,51.53223],[-0.12321,51.5331],[-0.12328,51.53313],[-0.12305,51.53364],[-0.12299,51.53387],[-0.12339,51.5344],[-0.12242,51.53469],[-0.12203,51.53527]]]},"name":"N1","styleUrl":"#N1","styleHash":"-4828af5","description":"N1 postcode district","fill":"#00ff00","fill-opacity":0.4980392156862745};
          // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
      await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        pubId, secondPubId
      ], {});
      // Create a new postcode
      await postcode.create(postcodeId, postcodeDoc.name, postcodeDoc.description, postcodeDoc.geometry, {});
    
      // Result
      var setupOptions = null;

      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {
        postcode: "N1"
      }, session: {}, options: {
        accessToken: accessToken
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async (template, object) => {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
          window.$ = function() {
            return {
              datetimepicker: function() {},
              on: function() {}
            }
          }        

          window.AdminClient = function() {
            return {
              setup: function(options) {
                setupOptions = options;
              }
            }
          }
        }});

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubFindPost(req, res)

      // Assertions
      process.nextTick(() => {
        assert(setupOptions);
        assert(setupOptions.searchPubs);
        assert(setupOptions.searchPubs.length > 0);  
      });
    });

    it('should return nothing due to neither address or post code passed', async () => {
      const crawlId = ObjectId();
      // Add a fake pub
      const pubId = ObjectId();
      const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
      const secondPubId = ObjectId();
      const secondPubDoc = {"_id":secondPubId,"name":"The Library","geometry":{"type":"Polygon","coordinates":[[[-0.1035345,51.5447115],[-0.1036715,51.5447278],[-0.1037658,51.5447384],[-0.103782,51.5446805],[-0.1035515,51.5446525],[-0.1035345,51.5447115]]]},"street":"Upper Street","housenumber":"235","postcode":"N1 1RU","city":null}
      const postcodeId = ObjectId();
      const postcodeDoc = {"_id": postcodeId,"geometry":{"type":"Polygon","coordinates":[[[-0.12203,51.53527],[-0.12241,51.53566],[-0.12319,51.53597],[-0.12304,51.53628],[-0.12317,51.53681],[-0.12325,51.53692],[-0.12479,51.53809],[-0.12576,51.53836],[-0.12379,51.5396],[-0.12349,51.54024],[-0.1235,51.54077],[-0.12301,51.54108],[-0.1228,51.54136],[-0.12213,51.54189],[-0.1212,51.54177],[-0.12093,51.54177],[-0.12086,51.5418],[-0.11937,51.54204],[-0.11919,51.54218],[-0.11869,51.54223],[-0.11834,51.54236],[-0.11792,51.54268],[-0.11786,51.54288],[-0.11732,51.54305],[-0.11705,51.54307],[-0.11687,51.54302],[-0.1157,51.54339],[-0.11537,51.54295],[-0.11514,51.54297],[-0.11407,51.54348],[-0.11379,51.54323],[-0.11372,51.54322],[-0.11304,51.54329],[-0.11294,51.54355],[-0.11256,51.54379],[-0.11219,51.54359],[-0.11218,51.54359],[-0.11185,51.54378],[-0.1114,51.54375],[-0.11136,51.54385],[-0.11106,51.54399],[-0.11058,51.54389],[-0.1105,51.54392],[-0.11048,51.54392],[-0.10994,51.54396],[-0.10984,51.5441],[-0.10969,51.54417],[-0.10947,51.54423],[-0.10944,51.54423],[-0.1093,51.54426],[-0.10921,51.54433],[-0.10919,51.54436],[-0.10904,51.54449],[-0.10907,51.54505],[-0.10895,51.54507],[-0.10882,51.54514],[-0.1083,51.54507],[-0.10752,51.54527],[-0.10739,51.54553],[-0.10668,51.54568],[-0.10657,51.54568],[-0.10617,51.54585],[-0.10593,51.5459],[-0.10558,51.54586],[-0.10474,51.54607],[-0.10471,51.54606],[-0.10406,51.54599],[-0.10387,51.54604],[-0.10327,51.54595],[-0.10288,51.54595],[-0.10296,51.54622],[-0.10269,51.54666],[-0.10263,51.54666],[-0.10202,51.5465],[-0.10197,51.54627],[-0.10144,51.54614],[-0.10131,51.54653],[-0.10143,51.54673],[-0.10115,51.54707],[-0.10103,51.5471],[-0.10026,51.54692],[-0.09914,51.54739],[-0.09872,51.54719],[-0.09826,51.54712],[-0.09802,51.54714],[-0.0975,51.54761],[-0.09675,51.54778],[-0.0961,51.54759],[-0.09578,51.54769],[-0.09573,51.54772],[-0.09543,51.54815],[-0.09419,51.54828],[-0.09411,51.54826],[-0.09332,51.54846],[-0.09325,51.54852],[-0.09217,51.54864],[-0.09173,51.54894],[-0.0912,51.54875],[-0.08987,51.54904],[-0.08984,51.54907],[-0.08939,51.54912],[-0.08877,51.54894],[-0.08804,51.54915],[-0.08794,51.54923],[-0.08801,51.54936],[-0.08708,51.54983],[-0.08738,51.55],[-0.08742,51.55019],[-0.08699,51.55058],[-0.08718,51.55083],[-0.08718,51.55089],[-0.08591,51.55113],[-0.08567,51.55109],[-0.08523,51.55125],[-0.08453,51.5508],[-0.08382,51.55114],[-0.08365,51.55146],[-0.08321,51.55151],[-0.08293,51.55111],[-0.08337,51.5507],[-0.08338,51.55063],[-0.0834,51.55061],[-0.08336,51.5502],[-0.08304,51.5501],[-0.08248,51.55016],[-0.08214,51.55008],[-0.08174,51.55025],[-0.08125,51.55023],[-0.08111,51.5503],[-0.08062,51.55033],[-0.08019,51.55004],[-0.08021,51.5498],[-0.07968,51.54959],[-0.07964,51.54955],[-0.07878,51.54948],[-0.07836,51.54967],[-0.07778,51.54944],[-0.07796,51.54909],[-0.078,51.54907],[-0.07864,51.54894],[-0.07869,51.54881],[-0.07892,51.54864],[-0.07896,51.54849],[-0.07889,51.5484],[-0.07834,51.54811],[-0.07759,51.54819],[-0.07755,51.54817],[-0.07754,51.54756],[-0.07713,51.54739],[-0.07703,51.54703],[-0.07734,51.54688],[-0.07728,51.54654],[-0.07697,51.54645],[-0.0769,51.54602],[-0.0765,51.54615],[-0.07601,51.54603],[-0.07578,51.5459],[-0.07647,51.54573],[-0.07649,51.54553],[-0.07596,51.54532],[-0.07605,51.54497],[-0.07564,51.54453],[-0.07622,51.54448],[-0.07719,51.54391],[-0.07702,51.54384],[-0.07668,51.54304],[-0.07659,51.54302],[-0.07567,51.5424],[-0.07572,51.54237],[-0.07627,51.54216],[-0.07642,51.54198],[-0.07652,51.54108],[-0.07657,51.54106],[-0.07669,51.54092],[-0.07646,51.54039],[-0.07647,51.54036],[-0.07694,51.54003],[-0.07675,51.53976],[-0.07681,51.53968],[-0.07764,51.53945],[-0.07756,51.53911],[-0.07725,51.53899],[-0.07743,51.53853],[-0.07811,51.53842],[-0.07816,51.53806],[-0.07762,51.53791],[-0.07766,51.53748],[-0.07831,51.53707],[-0.07826,51.53705],[-0.07765,51.53703],[-0.07669,51.53668],[-0.07668,51.53666],[-0.07704,51.53638],[-0.07689,51.53611],[-0.07733,51.53586],[-0.07733,51.53571],[-0.07707,51.53561],[-0.07706,51.53558],[-0.0771,51.53533],[-0.07773,51.53525],[-0.07784,51.53517],[-0.07749,51.53493],[-0.07699,51.53491],[-0.07675,51.53466],[-0.07678,51.53451],[-0.07697,51.53444],[-0.07721,51.5345],[-0.07828,51.53422],[-0.07787,51.53377],[-0.07741,51.53369],[-0.07734,51.53365],[-0.07798,51.53291],[-0.07788,51.53285],[-0.07782,51.53237],[-0.07781,51.53236],[-0.07723,51.53234],[-0.07669,51.53208],[-0.07724,51.53149],[-0.07678,51.53106],[-0.07732,51.53066],[-0.07725,51.53037],[-0.0776,51.53027],[-0.07765,51.53008],[-0.07814,51.53003],[-0.07837,51.52981],[-0.07915,51.52966],[-0.07914,51.52945],[-0.07922,51.52931],[-0.07912,51.52878],[-0.07891,51.52854],[-0.07891,51.52842],[-0.07888,51.52838],[-0.07775,51.52826],[-0.0777,51.52815],[-0.07773,51.5281],[-0.07836,51.52779],[-0.07858,51.5278],[-0.0788,51.52788],[-0.07899,51.52782],[-0.07954,51.52744],[-0.07959,51.52744],[-0.07981,51.5274],[-0.08019,51.52735],[-0.0802,51.52735],[-0.0807,51.52737],[-0.08084,51.52713],[-0.08069,51.52695],[-0.0809,51.52683],[-0.08126,51.5269],[-0.08129,51.52694],[-0.08195,51.52711],[-0.08214,51.52705],[-0.0823,51.52696],[-0.08245,51.52698],[-0.0828,51.52691],[-0.08326,51.52699],[-0.08335,51.52675],[-0.08334,51.52654],[-0.08367,51.5265],[-0.08392,51.52633],[-0.08407,51.52634],[-0.08425,51.52686],[-0.08448,51.52687],[-0.08474,51.52639],[-0.08506,51.52632],[-0.08528,51.52635],[-0.08552,51.52657],[-0.08553,51.52675],[-0.08572,51.52686],[-0.08577,51.52734],[-0.08619,51.52753],[-0.08639,51.52736],[-0.08662,51.52731],[-0.08678,51.52717],[-0.08654,51.52687],[-0.08701,51.52684],[-0.08707,51.52705],[-0.08741,51.52718],[-0.08778,51.52682],[-0.08798,51.52681],[-0.08809,51.52688],[-0.0883,51.5271],[-0.0883,51.52731],[-0.08762,51.5276],[-0.08766,51.52781],[-0.08895,51.52787],[-0.08919,51.52777],[-0.08955,51.52779],[-0.0897,51.52783],[-0.08983,51.52798],[-0.09021,51.52813],[-0.09043,51.52858],[-0.09112,51.52864],[-0.09155,51.52844],[-0.09179,51.52849],[-0.09208,51.52861],[-0.09208,51.52866],[-0.0923,51.52909],[-0.09248,51.52911],[-0.09248,51.52911],[-0.09323,51.52874],[-0.09349,51.52883],[-0.09377,51.52879],[-0.09446,51.52896],[-0.09524,51.52894],[-0.09538,51.52906],[-0.09433,51.52968],[-0.09448,51.52996],[-0.0947,51.53003],[-0.09526,51.52999],[-0.09592,51.52932],[-0.09678,51.52968],[-0.09678,51.53044],[-0.09776,51.53048],[-0.09789,51.53045],[-0.09851,51.53007],[-0.09863,51.5301],[-0.09873,51.53011],[-0.09902,51.53053],[-0.09915,51.53062],[-0.09966,51.53058],[-0.10012,51.53024],[-0.10027,51.53032],[-0.10053,51.53057],[-0.1005,51.53072],[-0.10046,51.53075],[-0.09982,51.53115],[-0.10039,51.53112],[-0.10081,51.53128],[-0.10096,51.53125],[-0.10116,51.53128],[-0.10125,51.53135],[-0.10202,51.53134],[-0.10224,51.53154],[-0.10269,51.53154],[-0.10304,51.53179],[-0.10318,51.53182],[-0.1033,51.53187],[-0.10331,51.53187],[-0.1036,51.53187],[-0.10419,51.5319],[-0.10424,51.53195],[-0.10466,51.53209],[-0.10466,51.53209],[-0.10486,51.53272],[-0.10578,51.53248],[-0.10579,51.53247],[-0.10581,51.5324],[-0.10593,51.53223],[-0.10596,51.53206],[-0.10646,51.53174],[-0.1069,51.53176],[-0.10708,51.5318],[-0.10773,51.53155],[-0.10778,51.5314],[-0.10778,51.53125],[-0.10773,51.53119],[-0.10821,51.53062],[-0.1089,51.53091],[-0.10897,51.53106],[-0.10974,51.53095],[-0.1097,51.53069],[-0.11018,51.53046],[-0.11058,51.53054],[-0.11077,51.53068],[-0.1112,51.5306],[-0.11173,51.53091],[-0.11172,51.53115],[-0.11242,51.53113],[-0.1128,51.53093],[-0.11283,51.53088],[-0.11328,51.53074],[-0.11371,51.53143],[-0.11388,51.5315],[-0.11453,51.53151],[-0.11484,51.53165],[-0.11488,51.53167],[-0.11559,51.5312],[-0.11559,51.53115],[-0.1161,51.53075],[-0.11612,51.53065],[-0.11614,51.53064],[-0.11653,51.53064],[-0.11681,51.53089],[-0.1174,51.53073],[-0.11754,51.53079],[-0.1178,51.53072],[-0.11802,51.53087],[-0.1184,51.53077],[-0.11857,51.53105],[-0.11921,51.53101],[-0.11923,51.53101],[-0.11927,51.53099],[-0.11957,51.53097],[-0.11983,51.53091],[-0.12009,51.53081],[-0.12024,51.53077],[-0.12022,51.53057],[-0.12027,51.53053],[-0.12109,51.53037],[-0.1211,51.53039],[-0.12145,51.53053],[-0.12144,51.5308],[-0.12165,51.53084],[-0.12183,51.53089],[-0.12239,51.53067],[-0.12256,51.53073],[-0.12278,51.53077],[-0.12338,51.53158],[-0.12304,51.53169],[-0.12251,51.53193],[-0.12247,51.53223],[-0.12321,51.5331],[-0.12328,51.53313],[-0.12305,51.53364],[-0.12299,51.53387],[-0.12339,51.5344],[-0.12242,51.53469],[-0.12203,51.53527]]]},"name":"N1","styleUrl":"#N1","styleHash":"-4828af5","description":"N1 postcode district","fill":"#00ff00","fill-opacity":0.4980392156862745};
          // Create pub 
      await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
      await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
        pubId, secondPubId
      ], {});
      // Create a new postcode
      await postcode.create(postcodeId, postcodeDoc.name, postcodeDoc.description, postcodeDoc.geometry, {});
    
      // Result
      var setupOptions = null;

      // Prepare the mock request
      const req = mockRequest({ db: database, params: {
        crawlId: crawlId
      }, body: {}, session: {}, options: {
        accessToken: accessToken
      }, baseUrl: '/admin'})
      const res = mockResponse({ redirect: async function(url) {
      }, render: async (template, object) => {
        const result = await ejs.renderFile(`views/${template}`, object || {});
        const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
          window.$ = function() {
            return {
              datetimepicker: function() {},
              on: function() {}
            }
          }        

          window.AdminClient = function() {
            return {
              setup: function(options) {
                setupOptions = options;
              }
            }
          }
        }});

        // console.log(doc.serialize())

        // Do assertions
        assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
      }});

      // Execute the indexGet
      await pubFindPost(req, res)

      // Assertions
      process.nextTick(() => {
        assert(setupOptions);
        assert(setupOptions.searchPubs);
        assert(setupOptions.searchPubs.length == 0);  
      });
    });

    // it('should not find pub to move up', async () => {
    //   const crawlId = ObjectId();
    //   // Add a fake pub
    //   const pubId = ObjectId();
    //   const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
    //   const secondPubId = ObjectId();
    //   const secondPubDoc = {"_id":secondPubId,"name":"The Ship and Shovell","geometry":{"type":"MultiPolygon","coordinates":[[[[-0.124766,51.5076021],[-0.1246849,51.5076631],[-0.1248584,51.507758],[-0.1249074,51.5077181],[-0.1248682,51.5077001],[-0.1248285,51.5076779],[-0.1248623,51.5076516],[-0.124766,51.5076021]]],[[[-0.1247432,51.5075838],[-0.124657,51.5075369],[-0.1246427,51.507547],[-0.1246632,51.5075582],[-0.1246498,51.507569],[-0.1246286,51.5075559],[-0.1246139,51.5075658],[-0.1246552,51.5075872],[-0.1246379,51.5075982],[-0.1246862,51.5076231],[-0.1247432,51.5075838]]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
    //       // Create pub 
    //   await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
    //   await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
    //   // Create a new pub crawl
    //   await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
    //     pubId, secondPubId
    //   ], {});
    
    //   // Prepare the mock request
    //   const req = mockRequest({ db: database, params: {
    //     crawlId: crawlId, pubId: ObjectId()
    //   }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
    //   const res = mockResponse({ redirect: async function(url) {
    //   }, render: async function(template, object) {
    //     const result = await ejs.renderFile(`views/${template}`, object || {});
    //     const doc = new JSDOM(result);

    //     // console.log(doc.serialize())

    //     // Do assertions
    //     assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
    //   }});

    //   // Execute the indexGet
    //   await pubMoveupGet(req, res)

    //   // Locate the crawl
    //   const doc = await crawl.findById(crawlId);

    //   // Assertions
    //   assert(doc.pubs)
    //   assert.deepEqual([pubId, secondPubId], doc.pubs);
    // });

    // it('should not change order due to trying to move first pub up', async () => {
    //   const crawlId = ObjectId();
    //   // Add a fake pub
    //   const pubId = ObjectId();
    //   const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
    //   const secondPubId = ObjectId();
    //   const secondPubDoc = {"_id":secondPubId,"name":"The Ship and Shovell","geometry":{"type":"MultiPolygon","coordinates":[[[[-0.124766,51.5076021],[-0.1246849,51.5076631],[-0.1248584,51.507758],[-0.1249074,51.5077181],[-0.1248682,51.5077001],[-0.1248285,51.5076779],[-0.1248623,51.5076516],[-0.124766,51.5076021]]],[[[-0.1247432,51.5075838],[-0.124657,51.5075369],[-0.1246427,51.507547],[-0.1246632,51.5075582],[-0.1246498,51.507569],[-0.1246286,51.5075559],[-0.1246139,51.5075658],[-0.1246552,51.5075872],[-0.1246379,51.5075982],[-0.1246862,51.5076231],[-0.1247432,51.5075838]]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
    //       // Create pub 
    //   await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
    //   await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
    //   // Create a new pub crawl
    //   await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [
    //     pubId, secondPubId
    //   ], {});
    
    //   // Prepare the mock request
    //   const req = mockRequest({ db: database, params: {
    //     crawlId: crawlId, pubId: pubId
    //   }, body: {}, session: {}, options: {}, baseUrl: '/admin'})
    //   const res = mockResponse({ redirect: async function(url) {
    //   }, render: async function(template, object) {
    //     const result = await ejs.renderFile(`views/${template}`, object || {});
    //     const doc = new JSDOM(result);

    //     // console.log(doc.serialize())

    //     // Do assertions
    //     assert.notEqual(null, doc.window.document.querySelector("#startLocationAddress"));
    //   }});

    //   // Execute the indexGet
    //   await pubMoveupGet(req, res)

    //   // Locate the crawl
    //   const doc = await crawl.findById(crawlId);

    //   // Assertions
    //   assert(doc.pubs)
    //   assert.deepEqual([pubId, secondPubId], doc.pubs);
    // });
  });
});