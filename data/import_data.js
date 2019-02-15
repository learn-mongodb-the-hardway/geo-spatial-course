const { MongoClient } = require('mongodb');
const { readFileSync } = require('fs');

// Read the pub data and parse the json
const geoJson = JSON.parse(readFileSync("./london_pubs.geojson"));

// Process all the features
geoJson.features.forEach(feature => {
  console.dir(feature)
});

