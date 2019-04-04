class PostCode {
  /**
   * Creates a new PostCode class instance
   * 
   * @param {Collection} collection The collection to operate against.
   */
  constructor(collection) {
    this.collection = collection;
  }

  /**
   * Create a new postcode document.
   * 
   * @async
   * @param {ObjectId} id The _id for the new document.
   * @param {String} name The name of the post code.
   * @param {String} description The description text of the post code.
   * @param {Object} geometry A geoJSON location object.
   * @param {Object} optionals Additional fields to merge into Postcode document.
   * @returns {Promise<Object>} Returns an object of Errors, no errors means no entries.
   */
  async create(id, name, description, geometry, optionals) {
    optionals = optionals || {};
    const errors = {};

    // Ensure we don't have null
    name = name || '';
    description = description || '';
    geometry = geometry || {};

    // Validations
    if (name.length == 0) errors['name'] = 'name cannot be blank';
    if (description.length == 0) errors['description'] = 'description cannot be blank';
    if (Object.keys(geometry).length == 0) {
      errors['geometry'] = 'geometry cannot be empty';
    } else if (geometry && (geometry.type == null || geometry.coordinates == null)) {
      errors['geometry'] = 'geometry is not a GeoJSON object';
    }

    // If we have any errors return
    if (Object.keys(errors).length) return errors;

    // Create the postcode entry
    await this.collection.insertOne(Object.assign({
      _id: id, name, description, geometry
    }, optionals));

    // Return
    return errors;
  }

  /**
   * Find a post code by its name
   * 
   * @async
   * @param {String} name The name of the postcode.
   * @returns {Promise<Object>} Returns a document.
   */
  async findOneByName(name) {
    return this.collection.findOne({
      name: name
    });
  }
}

module.exports = { PostCode };