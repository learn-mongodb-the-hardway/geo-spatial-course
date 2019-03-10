class PostCode {
  constructor(collection) {
    this.collection = collection;
  }

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
    if (Object.keys(geometry).length == 0) errors['geometry'] = 'geometry cannot be empty';

    // If we have any errors return
    if (Object.keys(errors).length) return errors;

    // Create the postcode entry
    await this.collection.insertOne(Object.assign({
      _id: id, name, description, geometry
    }, optionals));

    // Return
    return errors;
  }

  async findOneByName(name) {
    return this.collection.findOne({
      name: name
    });
  }
}

module.exports = { PostCode };