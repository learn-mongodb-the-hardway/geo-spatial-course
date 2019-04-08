const { ObjectId } = require('mongodb');
const { executeAndSkipException, isValidDate, isString } = require('../shared');

class Crawl {
  /**
   * Creates a new Crawl class instance
   * 
   * @param {Collection} collection The collection to operate against.
   */
  constructor(collection) {
    this.collection = collection;
  }

  /**
   * The create method allows us to create a new pub crawl document.
   * 
   * @async
   * @param {ObjectId} id The _id for the new document.
   * @param {String} name The name of the pub crawl.
   * @param {String} description The description text of the pub crawl.
   * @param {String} username The username of the user who is creating the pub crawl.
   * @param {Date} from The start date and time of the pub crawl.
   * @param {Date} to The end date and time of the pub crawl.
   * @param {Boolean} published The pub crawl has been published.
   * @param {ObjectId[]} pubs The list of pub id values in order of the start to end of the pub crawl.
   * @param {Object} optionals An object of optional values that are merged in.
   * @returns {Promise<Object>} Returns an object of Errors, no errors means no entries.
   */
  async create(id, name, description, username, from, to, published, pubs, optionals = {}) {
    const errors = {};

    // Ensure we don't have null
    name = name || '';
    description = description || '';
    username = username || '';
    published = published == null ? false : published;
    pubs = pubs || [];
    optionals = optionals || {};

    // Validations
    if (id == null) errors['id'] = 'id cannot be null';
    if (name.length == 0) errors['name'] = 'name cannot be null or empty';
    if (description.length == 0) errors['description'] = 'description cannot be null or empty';
    if (username.length == 0) errors['username'] = 'username cannot be null or empty';
    if (!isValidDate(from)) errors['fromdate'] = 'start date cannot be null or empty';
    if (!isValidDate(to)) errors['todate'] = 'end date cannot be null or empty';

    // from date must be < to
    if (isValidDate(from) && isValidDate(to) && to.getTime() <= from.getTime()) {
      errors['error'] = `end date must be after start date`;
    }

    // If we have any errors return
    if (Object.keys(errors).length) return errors;

    // Insert the new pub crawl object
    await this.collection.insertOne(Object.assign({
      _id: id, name, description, username, from, to, published, pubs, createdOn: new Date(), attendants: []
    }, optionals));

    return errors;
  }

  /**
   * Allows you to update any or all of the following fields (name, description, from and to) 
   * for a specific pub crawl.
   * 
   * @async
   * @param {ObjectId} crawlId The _id of the document we are updating
   * @param {String|null} name The new name of the pub crawl or null if no change
   * @param {String} description The new description of the pub crawl or null if no change
   * @param {Date} from The new from date and time or null if no change
   * @param {Date} to The new to date and time or null if no change
   * @returns {Promise<Object>} Returns an object of Errors, no errors means no entries
   */
  async update(crawlId, name, description, from, to) {
    const errors = {};
    const values = {};

    // Validate values not set to null
    if (isString(name) && name.length == 0) errors['name'] = 'name must be a valid string or null';
    if (isString(description) && description.length == 0) errors['description'] = 'description must be a valid string or null';
    if ((from != null && from != 'Invalid Date') && !isValidDate(from)) errors['fromdate'] = 'start date must be a valid date or null';
    if ((to != null && to != 'Invalid Date') && !isValidDate(to)) errors['todate'] = 'end date must be a valid date or null';

    // from date must be < to
    if (isValidDate(from) && isValidDate(to) && to.getTime() <= from.getTime()) {
      errors['error'] = `end date must be after start date`;
    }

    // If we have any errors return
    if (Object.keys(errors).length) return errors;

    // Map any valid values to set
    if (isString(name)) values['name'] = name;
    if (isString(description)) values['description'] = description;
    if (isValidDate(from)) values['from'] = from;
    if (isValidDate(to)) values['to'] = to;

    // Attempt to update the document
    const result = await this.collection.updateOne({
      _id: crawlId
    }, {
      $set: Object.assign(values, {
        updatedOn: new Date()
      })
    });

    if (result.matchedCount == 0) {
      errors['error'] = `the crawl with id ${crawlId} not found`;
    }

    return errors;
  }

  /**
   * Flips the published field to true for a specific pub crawl.
   * 
   * @async
   * @param {ObjectId} crawlId The _id of the pub crawl document.
   * @returns {Promise<Object>} Returns a document.
   */
  async publish(crawlId) {
    return this.collection.updateOne({
      _id: crawlId
    }, {
      $set: {
        published: true,
        publishedOn: new Date()
      }
    });
  }

  /**
   * Flips the published field to false for a specific pub crawl.
   * 
   * @async
   * @param {ObjectId} crawlId The _id of the pub crawl document.
   * @returns {Promise<Object>} Returns a document.
   */
  async unpublish(crawlId) {
    return this.collection.updateOne({
      _id: crawlId
    }, {
      $set: {
        published: false
      },
      $unset: {
        publishedOn: true
      }
    });
  }

  /**
   * Update the starting geoJSON location of the pub crawl.
   * 
   * @async
   * @param {ObjectId} crawlId The _id of the pub crawl document.
   * @param {Object} location geoJSON Feature object containing polygon field.
   * @returns {Promise<Object>} Returns a document.
   */
  async updateLocation(crawlId, location) {
    // Validate the location object
    if (location == null) throw Error('location parameter cannot be null');
    if (location.polygon == null) throw Error('location.polygon cannot be null');

    // Return the promise
    return this.collection.updateOne({
      _id: crawlId
    }, {
      $set: {
        location: location
      },
      $unset: {
        searchLocations: true
      }
    });
  }

  /**
   * Update the possible list of pub crawl locations, as well as the radius of the
   * starting circle for the pub crawl.
   * 
   * @async
   * @param {ObjectId} crawlId The _id of the pub crawl document.
   * @param {Object[]} locations A list of geo feature objects.
   * @param {Number} distance The distance from the center in meters of the starting circle for the pub crawl.
   * @returns {Promise<Object>} Returns a document.
   */
  async updateSearchLocations(crawlId, locations, distance = 1000) {
    locations = locations || [];
    // Validate the correctness of the entries
    for (let location of locations) {
      if (location.geometry == null) throw Error('location.geometry cannot be null');
      if (location.center == null) throw Error('location.center cannot be null');
    }

    // Update the starting location of the crawl
    return this.collection.updateOne({
      _id: new ObjectId(crawlId)
    }, {
      $set: {
        searchLocations: locations,
        locationDistance: distance
      }
    });
  }

  /**
   * Add the user as present to a set of pubs. (if the user is not clearly inside one pub
   * it adds it to the ones inside the users probable location circle).
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {ObjectId} userId The id of the user.
   * @param {ObjectId[]} pubIds The list of pub ids that are involved.
   * @returns {Promise<Object>} Returns a document.
   */
  async addUserToPubs(id, userId, pubIds = []) {
    if (pubIds.length == 0) return;
    // Create the set map
    const setMap = {};

    // Create pub list
    pubIds.forEach((id) => {
      setMap[`attendants_location.${id}`] = userId;
    });

    // Register the attendant in the specific pub
    return this.collection.updateMany({
      _id: id, pubs: {
        $all: pubIds
      }
    }, {
      $addToSet: setMap
    })
  }

  /**
   * Clear the user from being in any of the pubs in the pub crawl.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {ObjectId} userId The id of the user.
   * @returns {Promise<Object>} Returns a document.
   */
  async removeUserFromPubs(id, userId) {
    const doc = await this.collection.findOne({
      _id: id
    });

    // No document or no pubs in crawl
    if (!doc || doc.pubs.length == 0) return;

    // Build the update to remove the person from any pub in attendance
    const pubIds = doc.pubs || [];
    // Clear out any attendance
    var pullMap = {};
    // Create pub list
    pubIds.forEach((pubId) => {
      pullMap[`attendants_location.${pubId}`] = userId;
    });

    // Remove any existing pub attendances
    return await this.collection.updateMany({
      _id: id
    }, {
      $pull: pullMap
    });
  }

  /**
   * Remove the user as attending the pub crawl.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {ObjectId} userId The id of the user.
   * @returns {Promise<Object>} Returns a document.
   */
  async removeUserFromCrawl(id, userId) {
    const doc = await this.collection.findOne({
      _id: id
    });

    if (!doc) return;
    
    // Build the update to remove the person from any pub in attendance
    const pubIds = doc.pubs || [];
    
    // Build update clause
    const updateClause = { $pull: [] };

    // Pull attendance from any pubs we are checked into
    if (pubIds.length) {
      const removeAttendantMap = {};

      pubIds.forEach(pubId => {
        removeAttendantMap[`attendants_location.${pubId}`] = userId;
      });  

      updateClause['$pull'] = removeAttendantMap;
    }

    // Pull the user from the attendance array
    updateClause['$pull'].attendants = userId;

    // Finish up the crawl
    await this.collection.updateOne({
      _id: id
    }, updateClause);
  }

  /**
   * Add the user to the pub crawls attendant list.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {ObjectId} userId The id of the user.
   * @returns {Promise<Object>} Returns a document.
   */
  async addAttendant(id, userId) {
    return this.collection.updateOne({
      _id: id
    }, {
      $addToSet: {
        attendants: userId
      }
    });
  }

  /**
   * Add a pub id to the pub crawl list.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {ObjectId} pubId The pub id to add to the pub crawl pub list.
   * @returns {Promise<Object>} Returns a document.
   */
  async addPub(id, pubId) {
    return this.collection.updateOne({
      _id: id
    }, {
      $addToSet: {
        pubs: pubId
      }
    });
  }

  /**
   * Remove a pub from the list of pub crawl pubs.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {ObjectId} pubId The pub id to remove to the pub crawl pub list.
   * @returns {Promise<Object>} Returns a document.
   */
  async removePub(id, pubId) {
    return this.collection.updateOne({
      _id: id, 
      pubs: pubId
    }, {
      $pull: { pubs: pubId }
    });
  }

  /**
   * Move a specific pub id up in the pub crawl list order.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {ObjectId} pubId The pub id to move up on the pub crawl pub list.
   * @returns {Promise<Object>} Returns a document.
   */
  async movePubUp(id, pubId) {
    var crawl = await this.collection.findOne({
      _id: id
    });

    var updatePubs = [];

    crawl.pubs.forEach((id, index) => {
      if (id.toString() == pubId.toString() && index > 0) {
        var otherId = crawl.pubs[index - 1];
        updatePubs[index] = otherId;
        updatePubs[index - 1] = id;
      } else {
        updatePubs[index] = id;
      }
    });

    crawl.pubs = updatePubs;

    return this.collection.updateOne({
      _id: id
    }, {
      $set: {
        pubs: crawl.pubs
      }
    });
  }

  /**
   * Find a pub crawl by its _id
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @returns {Promise<Object>} Returns a document.
   */
  async findOneById(id) {
    return this.collection.findOne({
      _id: id
    });
  }

  /**
   * Locates all the pub crawls, who's starting area intersects with the current
   * location of the user and also are actually active as well as published.
   * 
   * @async
   * @param {Number[]} center An array of 2 elements [latitude, longitude] 
   * @param {Date} timestamp The current date and time
   * @returns {Promise<Object[]>} Returns a list of documents.
   */
  async findIntersectWithPointAndDates(center, timestamp) {
    return this.collection.find({
      'location.polygon': {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: center
          }
        }
      },
      from: {
        $lte: timestamp
      },
      to: {
        $gte: timestamp
      },
      published: true
    }).toArray();
  }

  /**
   * Find a pub crawl by the username
   * 
   * @async
   * @param {String} username The username used to match pub crawl.
   * @param {Number} sort The sort order of the returned pub crawls, default descending order.
   * @returns {Promise<Object[]>} Returns a list of documents.
   */
  async findByUsername(username, sort = { createdOn: -1 }) {
    return this.collection.find({
      username: username
    }).sort(sort).toArray();
  }

  /**
   * Find the pub crawl that matches the passed in id and is still active.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @param {Date} date The date used to validate if the pub crawl is still active.
   * @returns {Promise<Object>} Returns a document.
   */
  async findOneByIdAndDates(id, date) {
    return findWithLookup(this.collection, {
      $match: {
        _id: id,
        from: {
          $lte: date
        },
        to: {
          $gte: date
        }
      }
    });
  }

  /**
   * Find a pub crawl by its _id, merge in all the pub documents using $lookup.
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @returns {Promise<Object>} Returns a document.
   */
  async findOneByIdFull(id) {
    return findWithLookup(this.collection, {
      $match: {
        _id: id
      }
    });
  }

  /**
   * Find a pub crawl by its _id, merge in all users attending using $lookup
   * 
   * @async
   * @param {ObjectId} id The _id of the pub crawl document.
   * @returns {Promise<Object>} Returns a document.
   */
  async findOneByIdWithAttendants(id) {
    return this.collection.aggregate([{
      $match: {
        _id: id
      }
    }, {
      $lookup: {
        from: 'users',
        let: { userIds: "$attendants"},
        pipeline: [{
          $match: {
            $expr: {
              $in: ["$_id", "$$userIds"]
            }
          }
        }],
        as: "attendants"
      }
    }]).next();
  }

  /**
   * Create the default indexes, skip indexes if they fail
   * 
   * @async
   * @returns {Promise<>}
   */
  async createIndexes() {
    await executeAndSkipException(this.collection.createIndex({ "location.geometry": "2dsphere" }));
    await executeAndSkipException(this.collection.createIndex({ "location.polygon": "2dsphere" }));
  }
}

/**
 * Merges in all the pub documents for the pubIds field
 * Next sort the merged in pub documents in the original order
 *
 * @async 
 * @param {Collection} collection The MongoDB Collection that we run the aggregation against.
 * @param {Object} match The matching stage.
 * @returns {Promise<Object>} Returns a document.
 */
async function findWithLookup(collection, match) {
  var document = await collection.aggregate([match, {
    $lookup: {
      from: 'pubs',
      let: { pubIds: "$pubs" },
      pipeline: [{
        $match: {
          $expr: {
            $in: ["$_id", "$$pubIds"]
          }
        }
      }],
      as: "pubsFull"
    }
  }, {
    $project: {
      _id: "$_id",
      name: "$name",
      from: "$from",
      to: "$to",
      description: "$description",
      pubsOrdered: "$pubs",
      pubs: "$pubsFull",
      location: "$location",
      locationDistance: "$locationDistance",
      attendants: "$attendants"
    }
  }]).next();

  // Sort the merged in pub names
  if (document && document.pubsOrdered) {
    // Set the sorted pubs
    document.pubs = document.pubsOrdered.map(id => {
      for (var obj of document.pubs) {
        if (obj._id.toString() == id.toString()) {
          return obj;
        }
      }
    });
  }

  // Return the final document
  return document;
}

module.exports = { Crawl };