const { MapBoxServices } = require('../../lib/mapbox');
const { readFileSync } = require('fs');
const assert = require('assert');
// Check if env has been set
var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];

if (accessToken == null) {
  accessToken = readFileSync(`${__dirname}/../../token.txt`, 'utf8');
}

describe("Map Box Tests", () => {

  before(async () => {});

  beforeEach(async () => {});

  after(async () => {});

  afterEach(async () => {});

  it("should correctly encode address", async () => {
    const service = new MapBoxServices(accessToken);
    var results = await service.geoCode("Calle Doctor Casal 16, Oviedo, Asturias");
    assert.notEqual(results, null);
  });
});