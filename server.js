/**
 * server.js
 * This file defines the server for a
 * simple photo gallery web app.
 */
"use strict;"

/* global variables */
var multipart = require('./multipart');
var http = require('http');
var url = require('url');
var fs = require('fs');
var port = 3600;

/* load cached files */
var config = JSON.parse(fs.readFileSync('config.json'));
var stylesheet = fs.readFileSync('gallery.css');

/** @function getImageNames
 * Retrieves the filenames for all images in the
 * /images directory and supplies them to the callback.
 * @param {function} callback - function that takes an
 * error and array of filenames as parameters
 */
function getImageNames(callback) {
  fs.readdir('images/', function(err, fileNames){
    if(err) callback(err, undefined);
    else callback(false, fileNames);
  });
}

/** @function imageNamesToTags
 * Helper function that takes an array of image
 * filenames, and returns an array of HTML img
 * tags build using those names.
 * @param {string[]} filenames - the image filenames
 * @return {string[]} an array of HTML img tags
 */
function imageNamesToTags(fileNames) {
  return fileNames.map(function(fileName) {
    return `<a href=catalog/${fileName}>
		<img src="/${fileName}" alt="${fileName}">
		</a>`;
  });
}

/**
 * @function buildGallery
 * A helper function to build an HTML string
 * of a gallery webpage.
 * @param {string[]} imageTags - the HTML for the individual
 * gallery images.
 */
function buildGallery(imageTags) {
  var html =  '<!doctype html>';
      html += '<head>';
      html +=   '<title>' + config.title + '</title>';
      html +=   '<link href="gallery.css" rel="stylesheet" type="text/css">'
      html += '</head>';
      html += '<body>';
      html += '  <h1>' + config.title + '</h1>';
      html += '  <form method="GET" action="">';
      html += '    <input type="text" name="title">';
      html += '    <input type="submit" value="Change Gallery Title">';
      html += '  </form><br><br>';
      html += imageNamesToTags(imageTags).join('');
      html += ' <form action="" method="POST" enctype="multipart/form-data">';
	  html += ' 	<fieldset>';
	  html += ' 	<legend> Image Upload: </legend>';
      html += '   		<input type="file" name="image">';
      html += '   		<input type="submit" value="Upload Image">';
	  html += '         <br><br> Title: <br>';
	  html += '   		<input type="text" name="Title">';
	  html += '   		<br> Description: <br>';
	  html += '   		<input type="text" name="Description" class="mytext">';
	  html += ' 	</fieldset>';
      html += ' </form>';
      html += '</body>';
  return html;
}

/**
 * @function buildCatalog
 * A helper function to build an HTML string
 * of a gallery webpage.
 * @param {string[]} imageTags - the HTML for the individual
 * gallery images.
 */
function buildCatalog(file) {
	var imageJSON = JSON.parse(fs.readFileSync('json/'+file+'.json'))
  var html =  '<!doctype html>';
      html += '<head>';
      html +=   '<title>' + imageJSON.title + '</title>';
      html +=   '<link href="gallery.css" rel="stylesheet" type="text/css">'
      html += '</head>';
      html += '<body>';
      html += '  <h1>' + imageJSON.title + '</h1>';
	  //html += `<img src='/${imageJSON.name}.${imageJSON.type}' alt="${imageJSON.name}">`;
	  html += `<img src='/${imageJSON.file}' alt="${imageJSON.name}">`;
	  //html += imageJSON.image.data;
	  html += '   		<br> Description: <br>';
	  html += imageJSON.description;
      html += '</body>';
  return html;
}

/** @function serveGallery
 * A function to serve a HTML page representing a
 * gallery of images.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function serveGallery(req, res) {
  getImageNames(function(err, imageNames){
    if(err) {
      console.error(err);
      res.statusCode = 500;
      res.statusMessage = 'Server error';
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(buildGallery(imageNames));
  });
}
/** @function serveCatalog
 * A function to serve an image file.
 * @param {string} filename - the filename of the image
 * to serve.
 * @param {http.incomingRequest} - the request object
 * @param {http.serverResponse} - the response object
 */
function serveCatalog(fileName, req, res) {
	var file = fileName.split(".");
  /*fs.readFile('json/' + file[0], function(err, data){
    if(err) {
      console.error(err);
      res.statusCode = 404;
      res.statusMessage = "Resource not found";
      res.end();
      return;
    }*/
    res.setHeader('Content-Type', 'text/html');
    res.end(buildCatalog(file[0]));
  //});
}

/** @function serveImage
 * A function to serve an image file.
 * @param {string} filename - the filename of the image
 * to serve.
 * @param {http.incomingRequest} - the request object
 * @param {http.serverResponse} - the response object
 */
function serveImage(fileName, req, res) {
  fs.readFile('images/' + decodeURIComponent(fileName), function(err, data){
    if(err) {
      console.error(err);
      res.statusCode = 404;
      res.statusMessage = "Resource not found";
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'image/*');
    res.end(data);
  });
}

/** @function uploadImage
 * A function to process an http POST request
 * containing an image to add to the gallery.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function uploadImage(req, res) {
  multipart(req, res, function(req, res) {
    // make sure an image was uploaded
    if(!req.body.image.filename) {
      console.error("No file in upload");
      res.statusCode = 400;
      res.statusMessage = "No file specified"
      res.end("No file specified");
      return;
    }
	var file = req.body.image.filename.split(".");
	if(!req.body.Title) {
      req.body.Title = file[0];
	}
	if(!req.body.Description) {
      req.body.Description = file[0];
    }
    fs.writeFile('images/' + req.body.image.filename, req.body.image.data, function(err){
      if(err) {
        console.error(err);
        res.statusCode = 500;
        res.statusMessage = "Server Error";
        res.end("Server Error");
        return;
      }
	  var imageJSON = {"image":req.body.image, "file":req.body.image.filename, "title":req.body.Title, "description":req.body.Description};
	  fs.writeFile('json/'+file[0]+'.json', JSON.stringify(imageJSON), function(err){
		  if(err) {
			  console.error(err);
			  res.statusCode = 500;
			  res.statusMessage = "Server Error";
			  res.end("Server Error");
          return;
		  }
	  });
      serveGallery(req, res);
    });
  });
}

/** @function handleRequest
 * A function to determine what to do with
 * incoming http requests.
 * @param {http.incomingRequest} req - the incoming request object
 * @param {http.serverResponse} res - the response object
 */
function handleRequest(req, res) {
  // at most, the url should have two parts -
  // a resource and a querystring separated by a ?
  var urlParts = url.parse(req.url);

  if(urlParts.query){
    var matches = /title=(.+)($|&)/.exec(urlParts.query);
    if(matches && matches[1]){
      config.title = decodeURIComponent(matches[1]);
      fs.writeFile('config.json', JSON.stringify(config));
    }
  }
var path = urlParts.pathname.split("/");
  switch(path[1]) {
    case '':
    case 'gallery':
      if(req.method == 'GET') {
        serveGallery(req, res);
      } else if(req.method == 'POST') {
        uploadImage(req, res);
      }
      break;
    case 'gallery.css':
      res.setHeader('Content-Type', 'text/css');
      res.end(stylesheet);
      break;
	case 'catalog' :
	if(path[2] != 'gallery.json')
	  serveCatalog(path[2], req, res);
	  break;
    default:
      serveImage(req.url, req, res);
  }
}

/* Create and launch the webserver */
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server is listening on port ", port);
});
