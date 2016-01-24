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
  duration: 30 * 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
  activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
}));

server.use(sessions({
  cookieName: 'guestSession', // cookie name dictates the key name added to the request object
  secret: 'un48ung8ug8ogs4s4gns48u84u84j_-111229i29d9j9jcj', // should be a large unguessable string
  duration: 60 * 60 * 1000, // how long the session will stay valid in ms
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

    var deviceToken = "";
    if(req.params.deviceToken) {
      deviceToken = req.params.deviceToken;
    } else if(req.guestSession.deviceToken) {
      deviceToken = req.guestSession.deviceToken;
    }

    validateDeviceToken(deviceToken, onValidToken, onBadToken);

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
  req.session.destroy();
  req.guestSession.destroy();
  res.writeHead(302, {
    'Location': 'http://huvuddator.ddns.net/login'
  });
  res.end();
});

server.get('/connect/device/:deviceToken/fb/:fbToken', handleAllLoginCases);

function handleAllLoginCases(req, res, next) {
  var onBadToken = function() {
    var err = new restify.errors.NotAuthorizedError('Token is bad');
    console.log('also bad');
    console.log(err);
    next(err);
  }

  var onValidToken = function(userId) {
    req.session.userId = userId;
    req.session.deviceToken = req.params.deviceToken;
    res.writeHead(302, {
      'Location': 'http://huvuddator.ddns.net/client'
      //add other headers here...
    });
    res.end();
  }

  if(req.params.fbToken) {
    console.log(req.params.fbToken);
    validateFbToken(req.params.fbToken, onValidToken, onBadToken);
  } else if(req.params.deviceToken) {
    console.log(req.params.deviceToken);
    validateDeviceToken(req.params.deviceToken, onValidToken, onBadToken);
  } else {
    next(new restify.errors.NotAuthorizedError('Token missing'))
  }
};

server.get('/connect/device/:deviceToken', function(req, res, next) {
  console.log('/connect/device/' +req.params.deviceToken);
  console.log(req.session);

  if(!req.session.fbToken) {
    res.writeHead(302, {'Location': 'http://huvuddator.ddns.net/logout'});
    res.end();
  }

  if(!req.params.deviceToken) {
    res.end(JSON.stringify({
      result: false,
      message: 'Device token missing'
    }));
    next();
  }



});

server.get('/login/fb/:fbToken', function(req, res, next) {
  if(req.params.fbToken) {
    validateFbToken(
      req.params.fbToken,
      function(fbId) {
        req.session.fbId = fbId;
        req.session.fbToken = req.params.fbToken;

        require('./user_db').getFromFacebookId(fbId,
          function(user) {
            req.session.userId = user.uuid;
            res.writeHead(302, {'Location': 'http://huvuddator.ddns.net/client'});
            res.end();            
          },
          function() {
            require('./user_db').create(function(user) {

              user.value.fb = {id: fbId};
              require('./user_db').update(user.id, user.value, function() {
                req.session.userId = user.uuid;
                res.writeHead(302, {'Location': 'http://huvuddator.ddns.net/client'});
                res.end(); 
              });
            });
          });

      },
      function() {
        next(new restify.errors.NotAuthorizedError('Token missing'));
      }
    );
  } else {
    next(new restify.errors.NotAuthorizedError('Token missing'));
  }
});

server.get('/login/guest/device/:deviceToken', function(req, res, next) {
  if(req.params.deviceToken) {
    console.log('/login/guest/device/' +req.params.deviceToken);
    validateDeviceToken(
      req.params.deviceToken,
      function(deviceToken) {
        console.log('valid: ' +deviceToken);
        req.guestSession.deviceToken = req.params.deviceToken;
        res.writeHead(302, {'Location': 'http://huvuddator.ddns.net/client'});
        res.end();
      },
      function() {
        next(new restify.errors.NotAuthorizedError('Token missing'));
      }
    );
  } else {
    next(new restify.errors.NotAuthorizedError('Token missing'));
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
  console.log('/client');
  console.log(req.session);
  console.log(req.guestSession);

  var session = req.session.fbToken || req.guestSession.deviceToken;

  if(!session) {
    res.writeHead(302, {'Location': 'http://huvuddator.ddns.net/logout'});
    res.end();
  }

	fs.readFile('public/client.html', function (err, html) {

		res.setHeader('Content-Type', 'text/html');
		res.writeHead(200);
		res.end(html);
		next();
	});
}


function publicFile(req, res, next) {
  fs.readFile('public/' +req.params.fileName, function (err, content) {
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

// DB endpoint
server.get('/device', function(req, res, next) {
  console.log('/device');
  console.log(req.session);
  console.log(req.guestSession);

  var session = req.session || req.guestSession;
  console.log(session.deviceToken);
  console.log(session.userId);


  DeviceDb.get(req.guestSession.deviceToken, function(data) {
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

server.get('/user/:id', function(req, res, next) {
  var UserDB = require('./user_db');
  UserDB.get(req.params.id, function(data) {
    res.send(data);
    next();
  });
});

server.post('/user', function(req, res, next) {
  console.log(req.body);
  var UserDB = require('./user_db');
  UserDB.create(function(data) {
    res.end(JSON.stringify(data));
    next();
  });
});

server.post('/user/:userId/device', function(req, res, next) {
  console.log(req.body);
  console.log(req.params.deviceId);

  var UserDB = require('./user_db');

  UserDB.get(req.params.userId, function(value) {
    DeviceDb.get(req.params.deviceId, 
    function(data) {
      value.device.push(req.params.deviceId);
      UserDB.update(req.params.userId, value, function(result) {
        res.end(JSON.stringify(result));
        next();
      });
    },
    function() { // Device not found
      res.end(JSON.stringify('Device not found'));
      next();
    });
  },
  function() { // Device not found
    res.end(JSON.stringify('User not found'));
    next();
  });
});

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
