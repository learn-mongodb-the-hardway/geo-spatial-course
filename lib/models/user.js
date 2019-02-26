const crypto = require('crypto');

class User {
  constructor(collection) {
    this.collection = collection;
  }

  async create(id, username, password, confirmPassword, optional) {
    optional = optional || {};
    const errors = [];
    
    // Validations
    if (id == null) errors['id'] = "A id must be provided";
    if (username == null || username.length == 0) errors['username'] = 'username cannot be blank';
    if (password == null || password.length == 0) errors['password'] = 'password cannot be blank';
    if (confirmPassword == null || confirmPassword.length == 0) errors['confirmPassword'] = 'confirmPassword cannot be blank';
    if (password != confirmPassword) errors['password'] = 'password and confirmPassword must be equal';

    // If we have any errors return
    if (errors.length) return errors;

    // Hash the password
    const hash = crypto.createHash('sha256');
    hash.write(password);
    const hashedPassword = hash.digest('hex');

    // Create user
    await this.collection.insertOne({
      _id: id, username: username, password: hashedPassword, createdOn: new Date(), role: "admin"
    });

    // Return any 
    return errors;
  }

  async findById(id) {
    return this.collection.findOne({
      _id: id
    });
  }

  async findByUsername(username) {
    return this.collection.findOne({
      username: username
    });
  }
}

module.exports = { User };