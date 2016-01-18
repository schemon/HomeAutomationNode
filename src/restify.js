var restify = require('restify');
var fs = require('fs');
var https = require('https');
var request = require('request');
var sessions = require('client-sessions');




var auth = require('./auth_endpoint.js')
var DeviceDb = require('./device_db');

var server = restify.createServer();

server.use(sessions({
  cookieName: 'session', // cookie name dictates the key name added to the request object
  secret: '949jkg-rgrg30fjxjak)kookOKofsJOllalallqu33jjvdv', // should be a large unguessable string
  duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
  activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
}));

server.use(restify.bodyParser());
server.use(restify.acceptParser(server.acceptable));

server.use(function sessionParser(req, res, next) {
  if(['/auth'].indexOf(req.url) >= 0) {
    console.log('## Auth requried ##');
    console.log(req.params);


    var onValidToken = function(userId) {
      console.log('allright!!: ' + userId);
      req.userId = userId;
      next();
    }

    var onBadToken = function() {
      var err = new restify.errors.NotAuthorizedError('Token is bad');
      console.log('also bad');
      console.log(err);
      next(err);
    }

    validateDeviceToken(req.session.deviceToken, onValidToken, onBadToken);

    //if(req.params.fbToken) {
    //  validateFbToken(req.params.fbToken, onValidToken, onBadToken);
    //}

  } else {
    next();
  }
});


server.get('/login', function(req, res, next) {
  fs.readFile('public/login.html', function (err, html) {

    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(html);
    next();
  });
});

server.get('/logout', function(req, res, next) {
  req.session.deviceToken = "";
  res.writeHead(302, {
    'Location': 'http://huvuddator.ddns.net/login'
    //add other headers here...
  });
  res.end();
});

server.get('/login/fb/:fbToken', function(req, res, next) {
  var onBadToken = function() {
    var err = new restify.errors.NotAuthorizedError('Token is bad');
    console.log('also bad');
    console.log(err);
    next(err);
  }

  var onValidToken = function(userId) {
    req.session.deviceToken = 'ce9eeafb23c34f938947a359fed5c2c2';
    res.writeHead(302, {
      'Location': 'http://huvuddator.ddns.net/client'
      //add other headers here...
    });
    res.end();

  }

  if(req.params.deviceToken) {
    validateDeviceToken(req.params.deviceToken, onValidToken, onBadToken);
  } else if(req.params.fbToken) {
    console.log(req.params.fbToken);
    validateFbToken(req.params.fbToken, onValidToken, onBadToken);
  } else {
    next(new restify.errors.NotAuthorizedError('Token missing'))
  }


});

function validateDeviceToken(token, onValidToken, onBadToken) {
  DeviceDb.get(token, function(data){
      console.log('valid token!');
      onValidToken(token);
    }, onBadToken);
}

function validateFbToken(token, onValidToken, onBadToken) {
  request('https://graph.facebook.com/me?access_token=' +token, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = JSON.parse(body);
      onValidToken(data.id);
    } else {
      onBadToken();      
    }
  });
}

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

function commands(req, res, next) {
  var url = 'https://drive.google.com/uc?export=download&id=0B2JjHFhi0l1EczhkOVB3U2VWZUE';
  request(url, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
      htmlFormatCommands(JSON.parse(body), function(result) {
        res.send(result);
        next();
      });
    } else {
      res.send(error);
      next();
    }
	});
}

function htmlFormatCommands(body, callback) {
  callback(body);

  var command = body;
  var i = 0;
  var result = command.map(function(o) {
    var item = '<button type="button" onClick="send(' + i + ')">' + o.name + '</button>';
    if(i%2) item += '<br>';
    i++;
    return item; 
  });

  result.push('<script>'
      +    'function send(id) {'
      +    'var db = ' +JSON.stringify(command) +';' 
      +      'sendPusherMessage(db[id]);'
      +    '}'
      + '</script>');

  callback(result);
}


function client(req, res, next) {
  console.log(req.session);

  if(!req.session || !req.session.deviceToken || req.session.deviceToken == "") {
    res.writeHead(302, {
      'Location': 'http://huvuddator.ddns.net/login'
      //add other headers here...
    });
    res.end();
    return; 
  }

	fs.readFile('./client.html', function (err, html) {

		res.setHeader('Content-Type', 'text/html');
		res.writeHead(200);
		res.end(html);
		next();
	});
}


function publicFile(req, res, next) {
  fs.readFile('./public/' +req.params.fileName, function (err, content) {
    res.setHeader('Content-Type', 'text/css');
    res.writeHead(200);
    res.end(content);
    next();
  });
}

function script(req, res, next) {
	console.log(req.params);
	fs.readFile('public/' + req.params.res, function (err, content) {
    if (err) {
        throw err; 
    }

		res.setHeader('Content-Type', 'application/javascript');
		res.writeHead(200);
		res.end(content);
		next();
	});
	next();
}

server.post('/auth', auth.auth);
server.get('/client', client);
server.get('/script/:res', script);
server.get('/public/:fileName', publicFile);
server.get('/command', commands);


server.get('/command/:sid', function(req, res, next) {
  console.log(req.params.id);

  var SimpleStore = require('./simple_store');
  SimpleStore.get('command', req.params.sid, function(data) {
    htmlFormatCommands(data, function(result) {
      res.send(result);
      next();
    });
  });
});


server.post('/command/:sid', function(req, res, next) {
  console.log(req.body);
  var SimpleStore = require('./simple_store');
  SimpleStore.put('command', req.params.sid, req.body, function(data) {
    console.log(JSON.stringify(data));
    res.end(JSON.stringify(data));
    next();
  });
});


// DB endpoint
server.get('/device/:id', function(req, res, next) {
  console.log(req.params.id);
  DeviceDb.get(req.params.id, function(data) {
    res.send(data);
    next();
  });
});

server.post('/device', function(req, res, next) {
  DeviceDb.create('{}', function(data) {
    res.send(data);
    next();
  });
});

// DB endpoint
server.get('/user/:fbToken', function(req, res, next) {
  var SimpleStore = require('./simple_store');
  SimpleStore.get('user', req.userId, function(data) {
    res.send(data);
    next();
  });
});

server.post('/user/:fbToken', function(req, res, next) {
  console.log(req.body);
  var SimpleStore = require('./simple_store');
  SimpleStore.put('user', req.userId, req.body, function(data) {
    console.log(JSON.stringify(data));
    res.end(JSON.stringify(data));
    next();
  });
});



server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
