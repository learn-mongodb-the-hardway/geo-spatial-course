const geoCodingClient = require('@mapbox/mapbox-sdk/services/geocoding');

class GeoResultObject {
  constructor(object) {
    this.object = object;
  }
}

class MapBoxServices {
  constructor(accessToken) {
    this.geoCodingService = new geoCodingClient({ accessToken: accessToken });
  }

  async geoCode(address) {
    var result = await this.geoCodingService.forwardGeocode({
      query: address
    }).send();

    return result.body.features.map(feature => {
      return new GeoResultObject(feature);
    });
  }
}

module.exports = { MapBoxServices };