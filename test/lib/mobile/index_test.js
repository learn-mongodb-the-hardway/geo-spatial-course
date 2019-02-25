const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient, ObjectId } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { Crawl } = require('../../../lib/models/crawl');
const { Pub } = require('../../../lib/models/pub');
const { User } = require('../../../lib/models/user');
const { Attendant } = require('../../../lib/models/attendant');
const { JSDOM } = require("jsdom");

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var crawl = null;
var user = null;
var attendant = null;

// Routes
const { indexGet, indexPost } = require('../../../lib/mobile/routes/index');
const { locationPost } = require('../../../lib/mobile/routes/location');
const { leaveGet } = require('../../../lib/mobile/routes/leave');
const { joinGet, joinPost } = require('../../../lib/mobile/routes/join');
const { loginPost } = require('../../../lib/mobile/routes/login');

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../../token.txt`, 'utf8');
}

describe("Mobile Tests", () => {
  const pubId = ObjectId();
  const pubDoc = {"_id": pubId, "name":"The Queens","geometry":{"type":"Polygon","coordinates":[[[-0.1218882,51.5810518],[-0.1219419,51.5810068],[-0.1219536,51.5810117],[-0.1219916,51.5809767],[-0.1219826,51.580973],[-0.1220343,51.580927],[-0.1218916,51.5808583],[-0.1218425,51.5809018],[-0.1217803,51.5808749],[-0.1217738,51.5808807],[-0.1217312,51.5808607],[-0.1216892,51.5808951],[-0.1217341,51.5809162],[-0.1217098,51.5809379],[-0.1217686,51.5809633],[-0.1217486,51.5809798],[-0.121829,51.5810605],[-0.1218543,51.5810729],[-0.1218769,51.5810713],[-0.1218879,51.5810641],[-0.1218882,51.5810518]]]},"street":null,"housenumber":null,"postcode":null,"city":null};
  const secondPubId = ObjectId();
  const secondPubDoc = {"_id":secondPubId,"name":"The Ship and Shovell","geometry":{"type":"MultiPolygon","coordinates":[[[[-0.124766,51.5076021],[-0.1246849,51.5076631],[-0.1248584,51.507758],[-0.1249074,51.5077181],[-0.1248682,51.5077001],[-0.1248285,51.5076779],[-0.1248623,51.5076516],[-0.124766,51.5076021]]],[[[-0.1247432,51.5075838],[-0.124657,51.5075369],[-0.1246427,51.507547],[-0.1246632,51.5075582],[-0.1246498,51.507569],[-0.1246286,51.5075559],[-0.1246139,51.5075658],[-0.1246552,51.5075872],[-0.1246379,51.5075982],[-0.1246862,51.5076231],[-0.1247432,51.5075838]]]]},"street":null,"housenumber":null,"postcode":null,"city":null};

  before(async () => {
    // Connect to mongodb
    client = await (MongoClient(url, { useNewUrlParser: true })).connect();
    // Get and drop the test database
    database = client.db(databaseName);
    await database.dropDatabase();

    // Create model wrappers
    crawl = new Crawl(database.collection('crawls'));
    user = new User(database.collection('users'));
    pub = new Pub(database.collection('pubs'));
    attendant = new Attendant(database.collection('attendants'));

    // Create indexes
    await database.collection('crawls').createIndex({ 'location.polygon': "2dsphere" });
    await database.collection('pubs').createIndex({ geometry: "2dsphere" });

    // Some shared documents
    // Create two pubs 
    await pub.create(pubDoc._id, pubDoc.name, pubDoc.geometry, pubDoc.street, pubDoc.housenumber, pubDoc.postcode, pubDoc.city, {});
    await pub.create(secondPubDoc._id, secondPubDoc.name, secondPubDoc.geometry, secondPubDoc.street, secondPubDoc.housenumber, secondPubDoc.postcode, secondPubDoc.city, {});
  });

  after(async () => {
    await client.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("/ Route", () => {

    describe("get", () => {
      it("should correctly render the / page with no pub crawl in progress", async () => {
        var mobileSetupExecuted = false;
        // Prepare the mock request
        const req = mockRequest({ db: database, body: {}, session: {}, options: {}})
        const res = mockResponse({ render: async function(template, object) {
          const result = await ejs.renderFile(`views/${template}`, object || {});
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.mobileSetup = () => {
              mobileSetupExecuted = true;
            }
          }});

          // Do assertions
          assert.notEqual(null, doc.window.document.querySelector("#crawls"));
          assert.notEqual(null, doc.window.document.querySelector("#mapid"));
          // console.log(doc.serialize())
        }});

        // Execute the indexGet
        await indexGet(req, res)
        // Assertions
        assert.ok(mobileSetupExecuted);
      });  

      it("should correctly render the / page with a pub crawl in progress", async () => {
        const crawlId = ObjectId();
        // Create a new pub crawl
        await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {})

        // Prepare the mock request
        const req = mockRequest({ db: database, body: {}, session: {
          loggedIn: true, crawlId: crawlId
        }, options: {}})

        const res = mockResponse({ render: async function(template, object) {
          const result = await ejs.renderFile(`views/${template}`, object || {});
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.mobileSetup = () => {
              mobileSetupExecuted = true;
            }

            window.PubCrawlClient = function() {
              return {
                setup: function() {}
              }
            }

            window.$ = function() {
              return {
                on: function() {}
              }
            }
          }});

          // console.log(doc.serialize())
          // Do assertions
          assert.notEqual(null, doc.window.document.querySelector("#mapid"));
          assert.equal(`/mobile/leave`, doc.window.document.querySelector("nav div a[href]").href)
        }});

        // Execute the indexGet
        await indexGet(req, res)
      });
    });  

    describe("post", () => {
      it("should correctly a list with no pub crawls", async () => {
        // Create a new pub crawl, with a location
        const crawlId = ObjectId();
        // Create a new pub crawl
        await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

        const req = mockRequest({ db: database, body: {
          latitude: 51.52644050785097,
          longitude: -0.09700222888083221,
          timestamp: new Date().getTime()
        }, session: {}, options: {}})

        const res = mockResponse({ render: async function(template, object) {
          const result = await ejs.renderFile(`views/${template}`, object || {});
          const doc = new JSDOM(result);

          // Do assertions
          // console.log(doc.serialize())
          assert.equal(null, doc.window.document.querySelector("tbody tr"))
        }});

        // Execute the indexGet
        await indexPost(req, res)
      });

      it("should correctly find a pub crawl", async () => {
        // Create a new pub crawl, with a location
        const crawlId = ObjectId();
        // Create a new pub crawl
        await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], 
          {"location":{"polygon":{"type":"Polygon","coordinates":[[[-0.105026,51.54289315284119],[-0.10784387906053175,51.542720510333936],[-0.11055340651085396,51.54220922120916],[-0.11305040409292269,51.54137894496253],[-0.11523887843091213,51.54026160501795],[-0.11703471535614414,51.538900159433894],[-0.1183689142408354,51.5373469471079],[-0.11919023776292799,51.53566167348195],[-0.11946717556292472,51.53390911360477],[-0.11918914714956234,51.53215662120039],[-0.1183668990500802,51.53047153972078],[-0.11703208238249248,51.52891861496208],[-0.1152360285207121,51.52755750858678],[-0.11304777111916775,51.52644050785097],[-0.11055139131995274,51.52561051917166],[-0.10784278844706285,51.52509942219323],[-0.105026,51.5249268471588],[-0.10220921155293712,51.52509942219323],[-0.09950060868004722,51.52561051917166],[-0.09700422888083221,51.52644050785097],[-0.09481597147928786,51.52755750858678],[-0.0930199176175075,51.52891861496208],[-0.09168510094991977,51.53047153972078],[-0.09086285285043763,51.53215662120039],[-0.09058482443707525,51.53390911360477],[-0.09086176223707199,51.53566167348195],[-0.09168308575916458,51.5373469471079],[-0.09301728464385584,51.538900159433894],[-0.09481312156908785,51.54026160501795],[-0.0970015959070773,51.54137894496253],[-0.09949859348914601,51.54220922120916],[-0.10220812093946822,51.542720510333936],[-0.105026,51.54289315284119]]]}}});

        const req = mockRequest({ db: database, body: {
          latitude: 51.53389661886214,
          longitude: -0.10578632354736328,
          timestamp: new Date().getTime()
        }, session: {}, options: {}})
  
        const res = mockResponse({ render: async function(template, object) {
          const result = await ejs.renderFile(`views/${template}`, object || {});
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.mobileSetup = () => {
              mobileSetupExecuted = true;
            }
          }});
  
          // Do assertions
          // console.log(doc.serialize())
          assert.equal(`/mobile/join/${crawlId}`, doc.window.document.querySelector("tbody tr td a[href]").href)
        }});
  
        // Execute the indexGet
        await indexPost(req, res)
      });
    });
  });

  describe("/location Route", () => {
    const attendantId = ObjectId();
    const crawlId = ObjectId();

    before(async () => {
      // Create an attendant
      await attendant.create(attendantId, "peter", "peter", "password", "password", {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], 
        {"location":{"polygon":{"type":"Polygon","coordinates":[[[-0.105026,51.54289315284119],[-0.10784387906053175,51.542720510333936],[-0.11055340651085396,51.54220922120916],[-0.11305040409292269,51.54137894496253],[-0.11523887843091213,51.54026160501795],[-0.11703471535614414,51.538900159433894],[-0.1183689142408354,51.5373469471079],[-0.11919023776292799,51.53566167348195],[-0.11946717556292472,51.53390911360477],[-0.11918914714956234,51.53215662120039],[-0.1183668990500802,51.53047153972078],[-0.11703208238249248,51.52891861496208],[-0.1152360285207121,51.52755750858678],[-0.11304777111916775,51.52644050785097],[-0.11055139131995274,51.52561051917166],[-0.10784278844706285,51.52509942219323],[-0.105026,51.5249268471588],[-0.10220921155293712,51.52509942219323],[-0.09950060868004722,51.52561051917166],[-0.09700422888083221,51.52644050785097],[-0.09481597147928786,51.52755750858678],[-0.0930199176175075,51.52891861496208],[-0.09168510094991977,51.53047153972078],[-0.09086285285043763,51.53215662120039],[-0.09058482443707525,51.53390911360477],[-0.09086176223707199,51.53566167348195],[-0.09168308575916458,51.5373469471079],[-0.09301728464385584,51.538900159433894],[-0.09481312156908785,51.54026160501795],[-0.0970015959070773,51.54137894496253],[-0.09949859348914601,51.54220922120916],[-0.10220812093946822,51.542720510333936],[-0.105026,51.54289315284119]]]}}});
    });

    describe("get", () => {
      it("user is not logged in", async () => {
        var result = null;
        const req = mockRequest({ db: database, body: {}, session: {}, options: {}})
        const res = mockResponse({ send: async function(object) {
          result = object;
        }});
  
        // Execute the indexGet
        await locationPost(req, res)
        // Assertions
        assert.deepEqual({}, result);
      });

      it("user is logged in and passed geo coordinates", async () => {
        // Create mock req/res
        const req = mockRequest({ db: database, body: {
          longitude: -0.12184739112854004, latitude: 51.58095822359073
        }, session: {
          loggedIn: true, userId: attendantId
        }, options: {}})
        const res = mockResponse({ send: async function(object) {
          result = object;
        }});
  
        // Execute the indexGet
        await locationPost(req, res)

        // Grab the attendant doc
        const attendantDoc = await attendant.findById(attendantId);

        // Assertions
        assert.deepEqual({
          type: 'Point', coordinates: [ -0.12184739112854004, 51.58095822359073 ]
        }, attendantDoc.location);
      });

      it("user is logged in and part of a crawl", async () => {
        // Add a pub to the crawl
        await crawl.addPub(crawlId, pubId);
        await crawl.addPub(crawlId, secondPubId);
        // At our current attendant to the crawl
        await crawl.addAttendant(crawlId, attendantId);
        // Add the attendant to a specific pub
        await crawl.addAttendantToPub(crawlId, secondPubId, attendantId);

        // Create mock req/res
        const req = mockRequest({ db: database, body: {
          longitude: -0.12184739112854004, latitude: 51.58095822359073
        }, session: {
          loggedIn: true, userId: attendantId, crawlId: crawlId
        }, options: {}})

        const res = mockResponse({ send: async function(object) {
          result = object;
        }});
  
        // Execute the indexGet
        await locationPost(req, res)

        // Grab the docs
        const attendantDoc = await attendant.findById(attendantId);
        const crawlDoc = await crawl.findById(crawlId);

        // Assertions
        assert.deepEqual({
          type: 'Point', coordinates: [ -0.12184739112854004, 51.58095822359073 ]
        }, attendantDoc.location);
        assert.deepEqual([attendantId], crawlDoc.attendants_location[pubId.toString()]);
      });
    });
  });

  describe("/leave Route", () => {
    const attendantId = ObjectId();
    const crawlId = ObjectId();

    before(async () => {
      // Create an attendant
      await attendant.create(attendantId, "peter", "peter", "password", "password", {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], 
        {"location":{"polygon":{"type":"Polygon","coordinates":[[[-0.105026,51.54289315284119],[-0.10784387906053175,51.542720510333936],[-0.11055340651085396,51.54220922120916],[-0.11305040409292269,51.54137894496253],[-0.11523887843091213,51.54026160501795],[-0.11703471535614414,51.538900159433894],[-0.1183689142408354,51.5373469471079],[-0.11919023776292799,51.53566167348195],[-0.11946717556292472,51.53390911360477],[-0.11918914714956234,51.53215662120039],[-0.1183668990500802,51.53047153972078],[-0.11703208238249248,51.52891861496208],[-0.1152360285207121,51.52755750858678],[-0.11304777111916775,51.52644050785097],[-0.11055139131995274,51.52561051917166],[-0.10784278844706285,51.52509942219323],[-0.105026,51.5249268471588],[-0.10220921155293712,51.52509942219323],[-0.09950060868004722,51.52561051917166],[-0.09700422888083221,51.52644050785097],[-0.09481597147928786,51.52755750858678],[-0.0930199176175075,51.52891861496208],[-0.09168510094991977,51.53047153972078],[-0.09086285285043763,51.53215662120039],[-0.09058482443707525,51.53390911360477],[-0.09086176223707199,51.53566167348195],[-0.09168308575916458,51.5373469471079],[-0.09301728464385584,51.538900159433894],[-0.09481312156908785,51.54026160501795],[-0.0970015959070773,51.54137894496253],[-0.09949859348914601,51.54220922120916],[-0.10220812093946822,51.542720510333936],[-0.105026,51.54289315284119]]]}}});
    });

    describe("get", () => {
      it("user is logged in and leaves", async () => {
        var result = null;
        // Add a pub to the crawl
        await crawl.addPub(crawlId, pubId);
        await crawl.addPub(crawlId, secondPubId);
        // At our current attendant to the crawl
        await crawl.addAttendant(crawlId, attendantId);
        // Add the attendant to a specific pub
        await crawl.addAttendantToPub(crawlId, secondPubId, attendantId);

        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {
          loggedIn: true, userId: attendantId, crawlId: crawlId
        }, options: {}})

        const res = mockResponse({ redirect: async function(link) {
          result = link;
        }});
  
        // Execute the action
        await leaveGet(req, res)

        // Grab docs
        // const attendantDoc = await attendant.findById(attendantId);
        const crawlDoc = await crawl.findById(crawlId);

        // console.dir(attendantDoc)
        // console.dir(crawlDoc)

        // Assertions
        assert.equal('/', result);
        assert.deepEqual([], crawlDoc.attendants);
        assert.deepEqual([], crawlDoc.attendants_location[secondPubId.toString()]);
        assert.deepEqual(null, crawlDoc.attendants_location[pubId.toString()]);
      });
    });
  });

  describe("/join Route", () => {
    const attendantId = ObjectId();
    const crawlId = ObjectId();

    before(async () => {
      // Create an attendant
      await attendant.create(attendantId, "peter2", "peter2", "password", "password", {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], 
        {"location":{"polygon":{"type":"Polygon","coordinates":[[[-0.105026,51.54289315284119],[-0.10784387906053175,51.542720510333936],[-0.11055340651085396,51.54220922120916],[-0.11305040409292269,51.54137894496253],[-0.11523887843091213,51.54026160501795],[-0.11703471535614414,51.538900159433894],[-0.1183689142408354,51.5373469471079],[-0.11919023776292799,51.53566167348195],[-0.11946717556292472,51.53390911360477],[-0.11918914714956234,51.53215662120039],[-0.1183668990500802,51.53047153972078],[-0.11703208238249248,51.52891861496208],[-0.1152360285207121,51.52755750858678],[-0.11304777111916775,51.52644050785097],[-0.11055139131995274,51.52561051917166],[-0.10784278844706285,51.52509942219323],[-0.105026,51.5249268471588],[-0.10220921155293712,51.52509942219323],[-0.09950060868004722,51.52561051917166],[-0.09700422888083221,51.52644050785097],[-0.09481597147928786,51.52755750858678],[-0.0930199176175075,51.52891861496208],[-0.09168510094991977,51.53047153972078],[-0.09086285285043763,51.53215662120039],[-0.09058482443707525,51.53390911360477],[-0.09086176223707199,51.53566167348195],[-0.09168308575916458,51.5373469471079],[-0.09301728464385584,51.538900159433894],[-0.09481312156908785,51.54026160501795],[-0.0970015959070773,51.54137894496253],[-0.09949859348914601,51.54220922120916],[-0.10220812093946822,51.542720510333936],[-0.105026,51.54289315284119]]]}}});
    });

    describe("get", () => {
      it("existing user joining non existing pub crawl", async () => {
        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {
          loggedIn: true, userId: attendantId
        }, params: {
          crawlId: "5c73f17b5bfcf887753bc0fe"
        }, options: {}})
        const res = mockResponse({ redirect: async function(link) {
          result = link;
        }});
  
        // Execute the action
        await joinGet(req, res)

        // Assertions
        assert(result.startsWith('/?error='));
      });

      it("existing user joining non existing pub crawl", async () => {
        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {}, params: {
          crawlId: crawlId.toString()
        }, options: {}})
        const res = mockResponse({ render: async function(template, object = {}) {
          const result = await ejs.renderFile(`views/${template}`, object);
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.mobileSetup = () => {
              mobileSetupExecuted = true;
            }
          }});

          // Do assertions
          assert.notEqual(null, doc.window.document.querySelector("input[name='name']"));
          assert.notEqual(null, doc.window.document.querySelector("input[name='username']"));
          assert.notEqual(null, doc.window.document.querySelector("input[name='password']"));
          assert.notEqual(null, doc.window.document.querySelector("input[type='submit']"));
        }});
  
        // Execute the action
        await joinGet(req, res)

        // Assertions
        assert(result.startsWith('/?error='));
      });

      it("existing user joining an existing pub crawl", async () => {
        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {
          loggedIn: true, userId: attendantId
        }, params: {
          crawlId: crawlId.toString()
        }, options: {}})
        const res = mockResponse({ redirect: async function(link) {
          result = link;
        }});
  
        // Execute the action
        await joinGet(req, res)

        // Grab docs
        const crawlDoc = await crawl.findById(crawlId);

        // Assertions
        assert.equal('/', result);
        assert.deepEqual([attendantId], crawlDoc.attendants);
      });
    });

    describe("post", () => {
      it("Posting with all fields missing", async () => {
        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {
          loggedIn: true, userId: attendantId
        }, params: {
          crawlId: crawlId
        }, body: {
        }, options: {}})

        const res = mockResponse({ render: async function(template, object = {}) {
          const result = await ejs.renderFile(`views/${template}`, object);
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.mobileSetup = () => {
              mobileSetupExecuted = true;
            }
          }});

          // Do assertions
          assert.equal(true, doc.window.document.querySelector("#join_name").classList.contains('is-invalid'));
          assert.equal(true, doc.window.document.querySelector("#join_username").classList.contains('is-invalid'));
          assert.equal(true, doc.window.document.querySelector("#join_password").classList.contains('is-invalid'));
        }});
  
        // Execute the action
        await joinPost(req, res)
      });

      it("Posting with all fields present", async () => {
        var result = null;

        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {
          loggedIn: true, userId: attendantId
        }, params: {
          crawlId: crawlId
        }, body: {
          name: "integration peter", username: "integration_peter", password: "integration_peter"
        }, options: {}})

        const res = mockResponse({ redirect: async function(link) {
          result = link;
        }});
  
        // Execute the action
        await joinPost(req, res)

        // Grab the docs
        const attendantDoc = await attendant.findByUsername("integration_peter");
        const crawlDoc = await crawl.findById(crawlId);

        // console.dir(attendantDoc)
        // console.dir(crawlDoc)

        // Assert redirect
        assert.equal('/', result);

        // Attendant assertions
        assert(attendantDoc);
        assert.equal('integration peter', attendantDoc.name);
        assert.equal('integration_peter', attendantDoc.username);
        assert(attendantDoc.password);
        assert(attendantDoc.createdOn);

        // Crawl assertions
        assert(crawlDoc);
        assert(crawlDoc.attendants.indexOf(attendantDoc._id != -1));
      });
    });
  });

  describe("/login Route", () => {
    const attendantId = ObjectId();
    const crawlId = ObjectId();

    before(async () => {
      // Create an attendant
      await attendant.create(attendantId, "peter3", "peter3", "password", "password", {});
      // Create a new pub crawl
      await crawl.create(crawlId, "Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], 
        {"location":{"polygon":{"type":"Polygon","coordinates":[[[-0.105026,51.54289315284119],[-0.10784387906053175,51.542720510333936],[-0.11055340651085396,51.54220922120916],[-0.11305040409292269,51.54137894496253],[-0.11523887843091213,51.54026160501795],[-0.11703471535614414,51.538900159433894],[-0.1183689142408354,51.5373469471079],[-0.11919023776292799,51.53566167348195],[-0.11946717556292472,51.53390911360477],[-0.11918914714956234,51.53215662120039],[-0.1183668990500802,51.53047153972078],[-0.11703208238249248,51.52891861496208],[-0.1152360285207121,51.52755750858678],[-0.11304777111916775,51.52644050785097],[-0.11055139131995274,51.52561051917166],[-0.10784278844706285,51.52509942219323],[-0.105026,51.5249268471588],[-0.10220921155293712,51.52509942219323],[-0.09950060868004722,51.52561051917166],[-0.09700422888083221,51.52644050785097],[-0.09481597147928786,51.52755750858678],[-0.0930199176175075,51.52891861496208],[-0.09168510094991977,51.53047153972078],[-0.09086285285043763,51.53215662120039],[-0.09058482443707525,51.53390911360477],[-0.09086176223707199,51.53566167348195],[-0.09168308575916458,51.5373469471079],[-0.09301728464385584,51.538900159433894],[-0.09481312156908785,51.54026160501795],[-0.0970015959070773,51.54137894496253],[-0.09949859348914601,51.54220922120916],[-0.10220812093946822,51.542720510333936],[-0.105026,51.54289315284119]]]}}});
    });

    describe("post", () => {
      it("should fail to login", async () => {
        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {}, params: {
          crawlId: crawlId
        }, body: {

        }, options: {}})

        const res = mockResponse({ render: async function(template, object = {}) {
          const result = await ejs.renderFile(`views/${template}`, object);
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.mobileSetup = () => {
              mobileSetupExecuted = true;
            }
          }});

          // console.log(doc.serialize())
          // Do assertions
          assert.equal(true, doc.window.document.querySelector("#username").classList.contains('is-invalid'));
          assert.equal(true, doc.window.document.querySelector("#password").classList.contains('is-invalid'));
        }});

        // Execute the action
        await loginPost(req, res)
      });

      it("should fail to login due to wrong password", async () => {
        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {}, params: {
          crawlId: crawlId
        }, body: {
          username: "peter3", password: "password2"
        }, options: {}})
  
        const res = mockResponse({ render: async function(template, object = {}) {
          const result = await ejs.renderFile(`views/${template}`, object);
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.mobileSetup = () => {
              mobileSetupExecuted = true;
            }
          }});
  
          // console.log(doc.serialize())
          // Do assertions
          assert(doc.window.document.querySelector("#login_error"));
        }});
  
        // Execute the action
        await loginPost(req, res)
      });
    
      it("should login successfully", async () => {
        var result = null;
        // Create mock req/res
        const req = mockRequest({ db: database, baseUrl: '/', session: {}, params: {
          crawlId: crawlId
        }, body: {
          username: "peter3", password: "password"
        }, options: {}})
  
        const res = mockResponse({ redirect: async function(link) {
          result = link;
        }});
  
        // Execute the action
        await loginPost(req, res)
  
        // Assert redirect
        assert.equal('/', result);
      });
    });
  });
});