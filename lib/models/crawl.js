const { ObjectId } = require('mongodb');

class Crawl {
  constructor(collection) {
    this.collection = collection;
  }

  async create(id, name, description, username, from, to, published, pubs, optionals = {}) {
    return (await this.collection.insertOne(Object.assign({
      _id: id, name, description, username, from, to, published, pubs, createdOn: new Date()
    }, optionals))).insertedId
  }

  async update(crawlId, name, description, from, to) {
    return this.collection.updateOne({
      _id: crawlId
    }, {
      $set: {
        name: name,
        description: description,
        from: from,
        to: to,
        updatedOn: new Date()
      }
    });
  }

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
      }
    }).toArray();
  }

  async updateLocation(crawlId, location) {
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

  async updateSearchLocations(crawlId, locations, distance = 1000) {
    return this.collection.updateOne({
      _id: new ObjectId(crawlId)
    }, {
      $set: {
        searchLocations: locations,
        locationDistance: distance
      }
    });
  }

  async addUserToPubs(id, userId, pubIds = []) {
    if (pubIds.length == 0) return;
    // Create the set map
    var setMap = {};
    // Create pub list
    pubIds.forEach((id) => {
      setMap[`attendants_location.${id}`] = userId;
    });

    // Register the attendant in the specific pub
    await this.collection.updateMany({
      _id: id
    }, {
      $addToSet: setMap
    })
  }

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

  async addAttendant(id, attendantId) {
    return this.collection.updateOne({
      _id: id
    }, {
      $addToSet: {
        attendants: attendantId
      }
    });
  }

  async addAttendantToPub(id, pubId, attendantId) {
    const map = {}
    map[`attendants_location.${pubId}`] = attendantId;

    return this.collection.updateOne({
      _id: id
    }, {
      $addToSet: map
    });
  }

  async findById(id) {
    return this.collection.findOne({
      _id: id
    });
  }

  async findByUsername(username, sort = { createdOn: -1 }) {
    return this.collection.find({
      username: username
    }).sort(sort).toArray();
  }

  async addPub(id, pubId) {
    return this.collection.updateOne({
      _id: id
    }, {
      $addToSet: {
        pubs: pubId
      }
    });
  }

  async removePub(id, pubId) {
    return this.collection.updateOne({
      _id: id, 
      pubs: pubId
    }, {
      $pull: { pubs: pubId }
    });
  }

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

  async findByIdAndDates(id, date) {
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

  async findFull(id) {
    return findWithLookup(this.collection, {
      $match: {
        _id: id
      }
    });
  }

  async findWithAttendants(id) {
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
}

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