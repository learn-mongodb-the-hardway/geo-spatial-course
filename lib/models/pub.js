class Pub {
  constructor(collection) {
    this.collection = collection;
  }

  async create(id, name, geometry, street, housenumber, postcode, city, optionals) {
    optionals = optionals || {};

    return this.collection.insertOne(Object.assign({
      _id: id, name: name, geometry: geometry,
      street: street, housenumber: housenumber,
      postcode: postcode, city: city
    }, optionals)).insertedId;
  }

  async findByNearSphere(center, distance = 1000, pubIds = []) {
    const query = {
      geometry: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: center
          },
          $maxDistance: distance
        }
      }
    };

    if (pubIds.length > 0) {
      query["_id"] = {
        $in: pubIds
      }
    }

    return this.collection.find(query).toArray();
  }

  async findByWithin(geometry) {
    return this.collection.find({
      geometry: {
        $geoWithin: {
          $geometry: geometry
        }
      }
    }).toArray();
  }
}

module.exports = { Pub };