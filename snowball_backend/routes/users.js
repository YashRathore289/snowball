var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
