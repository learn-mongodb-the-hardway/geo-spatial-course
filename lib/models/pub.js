const { executeAndSkipException } = require('../shared');

class Pub {
  /**
   * Creates a new Pub class instance
   * 
   * @param {Collection} collection The collection to operate against.
   */
  constructor(collection) {
    this.collection = collection;
  }

  /**
   * Create a new pub document.
   * 
   * @async
   * @param {ObjectId} id The _id for the new document.
   * @param {String} name The name of the pub crawl.
   * @param {Object} geometry The geoJSON geometry of the pub.
   * @param {String} street The street name.
   * @param {Number} housenumber The street house number.
   * @param {String} postcode The postcode.
   * @param {String} city The name of the city.
   * @param {Object} optionals Additional fields to merge into Pub document.
   * @returns {Promise<Object>} Returns an object of Errors, no errors means no entries.
   */
  async create(id, name, geometry, street, housenumber, postcode, city, optionals) {
    throw Error('not implemented');
    // const errors = {};
    // optionals = optionals || {};

    // // Ensure we don't have null
    // name = name || '';
    // geometry = geometry || {};
    // street = street || '';
    // housenumber = housenumber || '';
    // postcode = postcode || '';
    // city = city || '';

    // // Validations
    // if (name.length == 0) errors['name'] = 'name cannot be blank';
    // if (Object.keys(geometry).length == 0) errors['geometry'] = 'geometry cannot be empty';

    // // If we have any errors return
    // if (Object.keys(errors).length) return errors;

    // // Insert the new pub document
    // await this.collection.insertOne(Object.assign({
    //   _id: id, 
    //   name: name, 
    //   geometry: geometry,
    //   street: street, 
    //   housenumber: housenumber,
    //   postcode: postcode, 
    //   city: city,
    //   createdOn: new Date()
    // }, optionals));

    // return errors;
  }

  /**
   * Find all pubs that are n meters from the a specified center point.
   * 
   * @async
   * @param {Array} center 
   * @param {Number} distance 
   * @param {ObjectId[]} pubIds 
   * @returns {Promise<Object[]>} Returns a list of documents.
   */
  async findByNearSphere(center, distance = 1000, pubIds = []) {
    throw Error('not implemented');
    // const query = {
    //   geometry: {
    //     $nearSphere: {
    //       $geometry: {
    //         type: "Point",
    //         coordinates: center
    //       },
    //       $maxDistance: distance
    //     }
    //   }
    // };

    // if (pubIds.length > 0) {
    //   query["_id"] = {
    //     $in: pubIds
    //   }
    // }

    // return this.collection.find(query).toArray();
  }

  /**
   * Find all pubs that fall within a geoJSON geometry.
   * 
   * @async
   * @param {Object} geometry The geoJSON geometry object.
   * @returns {Promise<Object[]>} Returns a list of documents.
   */
  async findByWithin(geometry) {
    throw Error('not implemented');
    // return this.collection.find({
    //   geometry: {
    //     $geoWithin: {
    //       $geometry: geometry
    //     }
    //   }
    // }).toArray();
  }

  /**
   * Create the default indexes, skip indexes if they fail
   * 
   * @async
   * @returns {Promise<>}
   */
  async createIndexes() {
    await executeAndSkipException(this.collection.createIndex({ geometry: "2dsphere" }));
  }
}

module.exports = { Pub };