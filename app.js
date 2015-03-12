
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
//var users = require('Users.json');
var fs = require('fs');
var jf = require('jsonfile')
var util = require('util');
var mkdirp = require('mkdirp');
var currentUser = "";

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('CSCI 4160 A1'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'users')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

function authenticate(name, pass, fn) {
	var file = '../Assignment1/node_modules/Users.json'
	jf.readFile(file, function(err, obj) 
	{
		var users = obj;
		var user = users[name];
		// query the db for the given username
		if (!user) return fn(new Error('cannot find user'));
		// check for the correct password
		if(users[name] == pass)
		return fn(null,user);
		else
		return fn(new Error("Invalid Password"));
	})
}


function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

app.get('/', function(req, res){
  res.redirect('login');
});


app.get('/restricted', restrict, function(req, res){
  res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});


app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
});

app.get('/login', function(req, res){
  res.render('login');
});

app.get('/join', function(req, res){
  res.render('join');
  
});

app.get('/upload', restrict, function(req, res){
  res.render('upload');
});

app.get('/gallery', restrict, function(req, res){
  var path ="./users/" + currentUser + '/';
  var files = fs.readdirSync(path);
  for (var i in files) {
	  console.log('File: ' + files[i]);
   }

  res.render('gallery', {
  	dest : currentUser, 
  	images: files });
});



app.post('/upload', function(req, res){
	var multiparty = require("multiparty");
	var form = new multiparty.Form();

	form.parse(req, function(err, fields, files){
 		var img = files.userPhoto[0];
 		var imageName = files.userPhoto[0].originalFilename;
 		var n = imageName.lastIndexOf(".");
 		var f = imageName.slice(n+1, imageName.length);
 		var acceptedFiles= ["jpg", "tif", "png", "jpeg", "gif", "bmp" ];
 		var found = false;
 		for (var i=0; i < acceptedFiles.length; i++){
 			if (f == acceptedFiles[i])
 				found = true;
 		}
 		if (found){
	 		fs.readFile(img.path, function(err, data){
	 			var path ="./users/" + currentUser + '/' + img.originalFilename;
	 			fs.writeFile(path,data, function(error){
	 				if (error) console.log(error);
	 				res.redirect('/gallery');
	 			});
	 		});
 		}
 		else
 		{
 			res.send("You can only upload Image file");
 		}
 });
});

app.post('/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation 
      req.session.regenerate(function(){
        // Store the user's primary key 
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.name
          + ' click to <a href="/logout">logout</a>. '
          + ' You may now access <a href="/restricted">/restricted</a>.';
        currentUser =  req.body.username;

        res.redirect('/gallery');
      });
    } else {
      req.session.error = 'Authentication failed, please check your '
        + ' username and password.'
        + ' (use "tj" and "foobar")';
      res.redirect('login');
    }
  });
});


app.post('/join', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
		console.log('User already exists');
	    res.redirect('/join');
    } else {
		var file = '../Assignment1/node_modules/Users.json'
		jf.readFile(file, function(err, obj) 
		{
			var users = obj;
			var key = req.body.username;
			var val = req.body.password;
			if(key.length!=0 && val.length!=0)
			{
				users[key] = req.body.password;
				jf.writeFileSync(file, users);
				mkdirp('users/' + key, function(err) {

});
				res.redirect('/login');
			}
			else
			{
				res.redirect('/join');
			}
		})
    }
  });
});


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
