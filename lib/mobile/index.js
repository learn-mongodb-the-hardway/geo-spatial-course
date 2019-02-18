var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
router.use(bodyParser.json());

module.exports = (options) => {
  router.get('/', (req, res) => {
    res.render('mobile/index.ejs', {
      accessToken: options.accessToken
    });
  });

  router.post('/location', (req, res) => {
    console.log("============== /location")
    // console.dir(req)
    console.log(req.body)
    res.send(req.body);
  })

  return router
};