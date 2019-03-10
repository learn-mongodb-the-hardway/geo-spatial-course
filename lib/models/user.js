const { hashPassword } = require('../shared');

class User {
  constructor(collection) {
    this.collection = collection;
  }

  async create(id, name, username, password, confirmPassword, optionals) {
    optionals = optionals || {};
    const errors = {};

    // Ensure we don't have null
    name = name || '';
    username = username || '';
    password = password || '';
    confirmPassword = confirmPassword || '';
    
    // Validations
    if (id == null) errors['id'] = "A id must be provided";
    if (name.length == 0) errors['name'] = 'name cannot be blank';
    if (username.length == 0) errors['username'] = 'username cannot be blank';
    if (password.length == 0) errors['password'] = 'password cannot be blank';
    if (confirmPassword.length == 0) errors['confirm_password'] = 'confirmPassword cannot be blank';
    if (password != confirmPassword) errors['error'] = 'password and confirm password must be equal';

    // Check if the user already exists
    if (Object.keys(errors).length == 0) {
      const doc = await this.collection.findOne({
        username: username
      });
      
      if (doc) {
        errors['error'] = `user ${username} already exists`;
      }
    }

    // If we have any errors return
    if (Object.keys(errors).length) return errors;

    // Hash the password
    const hashedPassword = hashPassword(password); 

    // Create user
    await this.collection.insertOne(Object.assign({
      _id: id, name: name, username: username, password: hashedPassword, createdOn: new Date()
    }, optionals));

    // Return any 
    return errors;
  }

  async changePassword(id, currentPassword, password, confirmPassword) {
    const errors = {};

    // Ensure we don't have null
    currentPassword = currentPassword || '';
    password = password || '';
    confirmPassword = confirmPassword || '';
    
    // Check if we have the right current password
    const hashedPassword = hashPassword(currentPassword);

    // Validations
    if (currentPassword.length == 0) errors['current_password'] = 'currentPassword cannot be blank';
    if (password.length == 0) errors['password'] = 'password cannot be blank';
    if (confirmPassword.length == 0) errors['confirm_password'] = 'confirmPassword cannot be blank';
    if (password != confirmPassword) errors['error'] = 'password and confirm password must be equal';

    // Check if the currentPassword and user exists
    if (Object.keys(errors).length == 0) {
      const user = await this.collection.findOne({
        _id: id, password: hashedPassword
      });

      if (!user) {
        errors['error'] = `User does not exist or current password entered is wrong`;
      }
    }

    // If we have errors break off and return
    if (Object.keys(errors).length > 0) {
      return errors;
    }

    // Hash the new password
    const newPasswordHashed = hashPassword(password);

    // Otherwise update the password
    await this.collection.updateOne({
      _id: id, password: hashPassword
    }, {
      $set: {
        password: newPasswordHashed
      }
    });

    return errors;
  }

  async updateLocation(id, location) {
    return this.collection.updateOne({
      _id: id
    }, {
      $set: {
        location: location,
        updatedOn: new Date()
      } 
    });
  }

  async findById(id) {
    return this.collection.findOne({
      _id: id
    });
  }

  async findOneByUsername(username) {
    return this.collection.findOne({
      username: username
    });
  }
}

module.exports = { User };