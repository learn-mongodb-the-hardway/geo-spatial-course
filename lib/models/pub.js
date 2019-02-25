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
}

module.exports = { Pub };