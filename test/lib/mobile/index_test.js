const { readFileSync } = require('fs');
const assert = require('assert');
const ejs = require('ejs');
const { MongoClient } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res')
const { Crawl } = require('../../../lib/models/crawl');
const { JSDOM } = require("jsdom");

// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];
var databaseName = "geo-spatial-test";
var url = "mongodb://localhost:27017";
var client = null;
var database = null;
var crawl = null;

// Routes
const { indexGet, indexPost } = require('../../../lib/mobile/routes/index');

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../../token.txt`, 'utf8');
}

describe("Mobile Tests", () => {

  before(async () => {
    client = MongoClient(url, { useNewUrlParser: true });
    await client.connect();
    database = client.db(databaseName);
    await database.dropDatabase();
    crawl = new Crawl(database.collection('crawls'));
    await database.collection('crawls').createIndex({ 'location.polygon': "2dsphere" });
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
        // Create a new pub crawl
        const crawlId = await crawl.create("Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {})

        // Prepare the mock request
        const req = mockRequest({ db: database, body: {}, session: {
          loggedIn: true, crawlId: crawlId
        }, options: {}})

        const res = mockResponse({ render: async function(template, object) {
          const result = await ejs.renderFile(`views/${template}`, object || {});
          const doc = new JSDOM(result, { runScripts: "dangerously", beforeParse: (window) => {
            window.PubCrawlClient = function() {
              return {
                setup: function() {}
              }
            },

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
        const crawlId = await crawl.create("Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], {});

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
          // console.log(doc.window.document.querySelector("nav div a[href]").href)
          // assert.equal(`/mobile/leave`, doc.window.document.querySelector("nav div a[href]").href)
        }});

        // Execute the indexGet
        await indexPost(req, res)
      });

      it("should correctly find a pub crawl", async () => {
        // Create a new pub crawl, with a location
        const crawlId = await crawl.create("Crawl 1", "Crawl Description", "peter", new Date(new Date().getTime() - 100000), new Date(new Date().getTime() + 100000), true, [], 
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
          assert.notEqual(null, doc.window.document.querySelector("tbody tr"))
          assert.equal(`/mobile/join/${crawlId}`, doc.window.document.querySelector("tbody tr td a[href]").href)
        }});
  
        // Execute the indexGet
        await indexPost(req, res)
      });
    });
  });
});