const { MongoClient } = require('mongodb');
const { readFileSync, createReadStream } = require('fs');
const readline = require('readline');

// Default config
var config = {
  accessToken: existsSync('../token.txt') ? readFileSync('../token.txt', 'utf8') : '',
  mongoURI: 'mongodb://localhost:27017',
  databaseName: 'geo-spatial',
  secret: 'session password..',
  port: 8080
};

// Do we have a config file, read it
if (existsSync('../config.json')) {
  config = Object.assign(config, JSON.parse(readFileSync('./config.json', 'utf8')));
}

// Import settings
const uri = config.mongoURI;
const databaseName = config.databaseName;
const pubFile = "./london_pubs.geojson";
const postCodeFile = "./postcodes.json";

// Read the pub data and parse the json
const geoJson = JSON.parse(readFileSync(pubFile));
var propertyNames = {};

async function execute() {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  await client.connect();
  const db = client.db(databaseName);
  const pubs = db.collection('pubs');
  const postcodes = db.collection('postcodes');

  // Drop existing collections
  try { await pubs.drop() } catch (err) {};
  try { await postcodes.drop() } catch (err) {};

  // Process all the features
  for (feature of geoJson.features) {
    Object.keys(feature.properties).forEach(key => {
      propertyNames[key] = true
    });

    var document = {
      name: feature.properties['name'],
      geometry: feature.geometry,
      street: feature.properties["addr:street"],
      housenumber: feature.properties["addr:housenumber"],
      postcode: feature.properties["addr:postcode"],
      city: feature.properties["addr:city"]
    }

    await pubs.insertOne(document);
  }

  // Read and insert geolines
  await processPostCodes(postcodes);

  // Stop client
  client.close();
}

async function processPostCodes(postcodes) {
  const lineReader = readline.createInterface({
    input: createReadStream(postCodeFile)
  });

  for await (const line of lineReader) {
    await postcodes.insertOne(JSON.parse(line));
  }
}

execute().then(() => {

});

