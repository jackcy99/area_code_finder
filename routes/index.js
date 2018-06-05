var express = require('express');
var router = express.Router();
var mycontroller = require('../controller/areacodeController');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
var os = require("os");
var my_fqdn = os.hostname() + '';
console.log(my_fqdn);

/* GET home page. */
/* Display book create form on GET. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express - North American area codes finder', hostname: my_fqdn});
});

/*
router.post("/search_area_code", function(req, res, next) {
  var req_area_code = req.body.myareacode;
  console.log(req_area_code);
});
*/
router.post("/search_area_code", mycontroller.searchareacode);

module.exports = router;
