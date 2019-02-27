const { ObjectId } = require('mongodb');

class Crawl {
  constructor(collection) {
    this.collection = collection;
  }

  async create(id, name, description, username, from, to, published, pubs, optionals = {}) {
    return (await this.collection.insertOne(Object.assign({
      _id: id, name, description, username, from, to, published, pubs
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

  async findByUserNameAndDates(id, date) {
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
      locationDistance: "$locationDistance"
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