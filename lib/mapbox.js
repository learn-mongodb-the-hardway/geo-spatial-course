const geoCodingClient = require('@mapbox/mapbox-sdk/services/geocoding');

class GeoResultObject {
  constructor(object) {
    this.id = object.id;
    this.placeName = object.place_name;
    this.center = object.center;
    this.geometry = object.geometry;
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