var express = require('express');
var router = express.Router();
const pool = require('./pool')

/* GET users listing. */
router.get('/', function (req, res, next) {
  try {
    pool.query("select 1;")
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.log(err)
  }
});

module.exports = router;
