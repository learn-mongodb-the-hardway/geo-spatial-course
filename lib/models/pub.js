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

  async findByNearSphere(center, distance = 1000) {
    return this.collection.find({
      geometry: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: center
          },
          $maxDistance: distance
        }
      }
    }).toArray();
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