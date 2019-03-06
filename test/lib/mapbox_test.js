const { MapBoxServices } = require('../../lib/mapbox');
const { readAccessToken } = require('./utils');
const assert = require('assert');
// Check if env has been set
var accessToken = readAccessToken(`${__dirname}/../../token.txt`);

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