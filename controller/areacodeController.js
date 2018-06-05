var express = require('express');
var mysql = require('mysql');
var app = express();
var outputString = '';
var city_name = '';
var str_result = '';
var os = require("os");
var my_fqdn = os.hostname();
var fs = require('fs');
var db_endpoint_url_file = fs.readFileSync('/home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json');
var db_endpoint_url = '';
fs.readFile('/home/ec2-user/myapp/myapp/db/db_cluster_endpoint.json', 'utf8', function (err, jdata) {
       if(!err) {
          var jObj = JSON.parse(jdata)
	  console.log(jObj);
	  db_endpoint_url = jObj.db_cluster_endpoint;
          console.log("Successfully find Aurora endpoint URL" + db_endpoint_url);
        }else {
           //Handle Error
           res.end("Error: "+err )
        }
   });

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

exports.searchareacode=function(req, res, next) {
  var req_area_code = req.body.myareacode;
  console.log(req_area_code);

  // query Amazon Aurora about which city is corresponse to this area code
  app.locals.hostname = db_endpoint_url;
  app.locals.username = 'dbuser';
  app.locals.password = '12345678';
  app.locals.port = '3306';
  app.locals.database = 'areacodedb';
  app.locals.connectionerror = 'successful';

  var connection = mysql.createConnection({
    host     : app.locals.hostname,
    user     : app.locals.username,
    password : app.locals.password,
    port     : app.locals.port,
    database : app.locals.database
  });
  console.log('[host]:'+app.locals.hostname+'\n',
              '[user]:'+app.locals.username+'\n',
              //'[password]:'+app.locals.password+'\n',
              '[port]:'+app.locals.port+'\n',
              '[database]:'+app.locals.database+'\n');
  connection.connect(function(err) {
    if (err) {
      console.error('Database connection failed: ' + err.stack);
      return;
    }
    console.log('Connected to database.');
  });


  var query_sql = 'SELECT location FROM areacodetable WHERE area_code=?';
  console.log(query_sql + '=' + req_area_code);
  connection.query(query_sql, req_area_code, function (err, results) {
    if (err) {
      console.error('SQL query (' +query_sql+') failed due to ' + err.stack);
    }
    console.log(results);
    city_name = '';
    str_result = '';
    if (results.length>0) {
      for (var my_index in results) {
        city_name = results[my_index].location;
        console.log('index=[' + my_index + ']\ncity name=[' + city_name + ']\n'); 
      }
      str_result = city_name;
    } else {
      str_result = 'Unfortunately this area code (' + req_area_code + ') is not found in North America';
    }

    console.log(str_result);
    //res.send(str_result);
    res.render('areacode_form', { title: 'Express - North American area codes finder', hostname: my_fqdn, myareacode: req_area_code, mylocation: str_result});
  });

  connection.end();
}
