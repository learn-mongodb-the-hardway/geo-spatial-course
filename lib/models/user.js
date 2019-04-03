const { hashPassword } = require('../shared');

class User {
  /**
   * Creates a new User class instance
   * 
   * @param {Collection} collection The collection to operate against.
   */
  constructor(collection) {
    this.collection = collection;
  }

  /**
   * Create a new User instance.
   * 
   * @async
   * @param {ObjectId} id The _id for the new pub crawl document.
   * @param {String} name The name of the user.
   * @param {String} username The username of the user.
   * @param {String} password The password for the user.
   * @param {String} confirmPassword The confirmation password for the user
   * @param {Object} optionals Additional fields to merge into User document.
   * @returns {Promise<Object>} Returns an object of Errors, no errors means no entries.
   */
  async create(id, name, username, password, confirmPassword, optionals) {
    throw Error('not implemented');
    // optionals = optionals || {};
    // const errors = {};

    // // Ensure we don't have null
    // name = name || '';
    // username = username || '';
    // password = password || '';
    // confirmPassword = confirmPassword || '';
    
    // // Validations
    // if (id == null) errors['id'] = "A id must be provided";
    // if (name.length == 0) errors['name'] = 'name cannot be blank';
    // if (username.length == 0) errors['username'] = 'username cannot be blank';
    // if (password.length == 0) errors['password'] = 'password cannot be blank';
    // if (confirmPassword.length == 0) errors['confirm_password'] = 'confirmPassword cannot be blank';
    // if (password != confirmPassword) errors['error'] = 'password and confirm password must be equal';

    // // Check if the user already exists
    // if (Object.keys(errors).length == 0) {
    //   const doc = await this.collection.findOne({
    //     username: username
    //   });
      
    //   if (doc) {
    //     errors['error'] = `user ${username} already exists`;
    //   }
    // }

    // // If we have any errors return
    // if (Object.keys(errors).length) return errors;

    // // Hash the password
    // const hashedPassword = hashPassword(password); 

    // // Create user
    // await this.collection.insertOne(Object.assign({
    //   _id: id, name: name, username: username, password: hashedPassword, createdOn: new Date()
    // }, optionals));

    // // Return any 
    // return errors;
  }

  /**
   * Change the user password.
   * 
   * @async
   * @param {ObjectId} id The _id for the user.
   * @param {String} currentPassword The current password of the user.
   * @param {String} password The password for the user.
   * @param {String} confirmPassword The confirmation password for the user
   * @returns {Promise<Object>} Returns an object of Errors, no errors means no entries.
   */
  async changePassword(id, currentPassword, password, confirmPassword) {
    throw Error('not implemented');
    // const errors = {};

    // // Ensure we don't have null
    // currentPassword = currentPassword || '';
    // password = password || '';
    // confirmPassword = confirmPassword || '';
    
    // // Check if we have the right current password
    // const hashedPassword = hashPassword(currentPassword);

    // // Validations
    // if (currentPassword.length == 0) errors['current_password'] = 'currentPassword cannot be blank';
    // if (password.length == 0) errors['password'] = 'password cannot be blank';
    // if (confirmPassword.length == 0) errors['confirm_password'] = 'confirmPassword cannot be blank';
    // if (password != confirmPassword) errors['error'] = 'password and confirm password must be equal';

    // // Check if the currentPassword and user exists
    // if (Object.keys(errors).length == 0) {
    //   const user = await this.collection.findOne({
    //     _id: id, password: hashedPassword
    //   });

    //   if (!user) {
    //     errors['error'] = `User does not exist or current password entered is wrong`;
    //   }
    // }

    // // If we have errors break off and return
    // if (Object.keys(errors).length > 0) {
    //   return errors;
    // }

    // // Hash the new password
    // const newPasswordHashed = hashPassword(password);

    // // Otherwise update the password
    // await this.collection.updateOne({
    //   _id: id, password: hashPassword
    // }, {
    //   $set: {
    //     password: newPasswordHashed
    //   }
    // });

    // return errors;
  }

  /**
   * Update the users current geoJSON location.
   * 
   * @async
   * @param {ObjectId} id The _id for the user.
   * @param {Object} location The users current geoJSON location.
   * @returns {Promise<Object>} Returns a document.
   */
  async updateLocation(id, location) {
    throw Error('not implemented');
    // return this.collection.updateOne({
    //   _id: id
    // }, {
    //   $set: {
    //     location: location,
    //     updatedOn: new Date()
    //   } 
    // });
  }

  /**
   * Find the first user by _id.
   * 
   * @async
   * @param {ObjectId} id The _id for the user.
   * @returns {Promise<Object>} Returns a document.
   */
  async findById(id) {
    throw Error('not implemented');
    // return this.collection.findOne({
    //   _id: id
    // });
  }

  /**
   * Find the first user by username
   * 
   * @async
   * @param {String} username The username used to locate the user.
   * @returns {Promise<Object>} Returns a document.
   */
  async findOneByUsername(username) {
    throw Error('not implemented');
    // return this.collection.findOne({
    //   username: username
    // });
  }
}

module.exports = { User };