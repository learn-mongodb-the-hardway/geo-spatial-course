class Crawl {
  constructor(collection) {
    this.collection = collection;
  }

  async findById(id) {
    return await this.collection.findOne({
      _id: id
    });
  }

  async findByUsername(username, sort) {
    if (sort == null) sort = {createdOn: -1};
    return await this.collection.find({
      username: username
    }).sort(sort).toArray();
  }

  async removePub(id, pubId) {
    return await this.collection.updateOne({
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
      if (id.toString() == pubId.toString()) {
        var otherId = crawl.pubs[index - 1];
        updatePubs[index] = otherId;
        updatePubs[index - 1] = id;
      } else {
        updatePubs[index] = id;
      }
    });

    crawl.pubs = updatePubs;

    return await this.collection.updateOne({
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

  // Set the sorted pubs
  document.pubs = document.pubsOrdered.map(id => {
    for (var obj of document.pubs) {
      if (obj._id.toString() == id.toString()) {
        return obj;
      }
    }
  });

  // Return the final document
  return document;
}

module.exports = { Crawl };