class Pub {
  constructor(collection) {
    this.collection = collection;
  }

  async create(id, name, geometry, street, housenumber, postcode, city, optionals) {
    const errors = {};
    optionals = optionals || {};

    // Ensure we don't have null
    name = name || '';
    geometry = geometry || {};
    street = street || '';
    housenumber = housenumber || '';
    postcode = postcode || '';
    city = city || '';

    // Validations
    if (name.length == 0) errors['name'] = 'name cannot be blank';
    if (Object.keys(geometry).length == 0) errors['geometry'] = 'geometry cannot be empty';

    // If we have any errors return
    if (Object.keys(errors).length) return errors;

    // Insert the new pub document
    await this.collection.insertOne(Object.assign({
      _id: id, 
      name: name, 
      geometry: geometry,
      street: street, 
      housenumber: housenumber,
      postcode: postcode, 
      city: city,
      createdOn: new Date()
    }, optionals));

    return errors;
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

  async createIndexes() {
    return this.collection.createIndex({
      geometry: "2dsphere"
    });
  }
}

module.exports = { Pub };