
var restify = require('restify');
var fs = require('fs');
var https = require('https');
var request = require('request');
var sessions = require('client-sessions');
var async = require('async')


// My own code
var auth = require('./pusher/auth_endpoint')
var DeviceDb = require('./database/device_db');
var UserDb = require('./database/user_db')

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
      console.log(err);
      res.send({result: false});
      res.end();
    }

    validateDeviceToken(req.params.deviceToken, onValidToken, onBadToken);
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


server.get('/connect/device/:deviceToken', function(req, res, next) {
  console.log('/connect/device/' +req.params.deviceToken);
  console.log(req.session);

  if(!req.session.userId) {
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

  UserDb.get(req.session.userId, 
    function(user) {
    console.log('Found user');
    console.log(user);
      if(user.value.device.indexOf(req.params.deviceToken) >= 0) { 
        res.end(JSON.stringify({
          result: true,
          message: 'Device already exists'
        }));
        res.end();
      } else {
        user.value.device.push(req.params.deviceToken);
        UserDb.update(user.id, user.value, function() {
          res.end(JSON.stringify({
            result: true,
            message: 'Device added'
          }));
          res.end();
        });
      }
    },
    function() {
      res.writeHead(302, {'Location': 'http://huvuddator.ddns.net/logout'});
      res.end();
    }
  );


});

server.get('/login/fb/:fbToken', function(req, res, next) {
  console.log('/login/fb/' +req.params.fbToken);
  if(req.params.fbToken) {
    validateFbToken(
      req.params.fbToken,
      function(fbId) {
        console.log('Token valid fbId: ' +fbId)


        req.session.fbId = fbId;
        req.session.fbToken = req.params.fbToken;

        UserDb.getFromFacebookId(fbId,
          function(user) {
            console.log('User known: ' +JSON.stringify(user));

            req.session.userId = user.id;
            res.writeHead(302, {'Location': 'http://huvuddator.ddns.net/client'});
            res.end();
          },
          function() {
            console.log('Create new user');

            UserDb.create(function(user) {
              user.value.fb = {id: fbId};
              console.log('Update user to: ' +JSON.stringify(user));

              UserDb.update(user.id, user.value, function() {
                req.session.userId = user.id;

                console.log('Done');
                console.log(user);
                console.log(req.session);

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
  DeviceDb.get(token, function(err, data){
    if(err) {
      console.log('Invalid token!');
      onBadToken('Invalid token')
    }
  
    console.log('valid token!');
    onValidToken(token);
});
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

server.get('/command', function(req, res, next) {
  var url = 'https://drive.google.com/uc?export=download&id=0B2JjHFhi0l1EczhkOVB3U2VWZUE';
  request(url, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
      res.send(JSON.parse(body));
      next();
    } else {
      res.send(error);
      next();
    }
	});
});

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
  console.log('/device/' +req.params.id);
  console.log(req.session);
  console.log(req.guestSession);

  DeviceDb.get(req.params.id, function(err, data) {
    res.send([data]);
    next();
  });
});

// DB endpoint
server.get('/device', function(req, res, next) {
  console.log('/device');
  console.log(req.session);
  console.log(req.guestSession);

  if(req.session.userId) {
    UserDb.get(req.session.userId, function(user) {
      console.log(user);

      async.map(user.value.device, DeviceDb.get, function(err, result) {
        console.log(result);
        res.send(result);
        res.end();
      });
      /*
      if(user.value.device.length < 1) {
          res.send([]);
          next();
      } else {
        DeviceDb.get(user.value.device[0], function(device) {
          console.log(device);
          res.send(device);
          next();
        });        
      }

      */
    });

  } else if(req.guestSession.deviceToken) {
    DeviceDb.get(req.guestSession.deviceToken, function(err, data) {
      res.send([data]);
      res.end();
    });
  } else {
    res.send(JSON.stringify({result: false, message: 'No'}));
    res.end();
  }
});

server.post('/device', function(req, res, next) {
  console.log('POST /device')
  DeviceDb.create('{}', function(err, data) {
    res.send(data);
    next();
  });
});

server.get('/user/:id', function(req, res, next) {
  var UserDB = UserDb;
  UserDB.get(req.params.id, function(data) {
    res.send(data);
    next();
  });
});

server.post('/user', function(req, res, next) {
  console.log(req.body);
  var UserDB = UserDb;
  UserDB.create(function(data) {
    res.end(JSON.stringify(data));
    next();
  });
});

server.post('/user/:userId/device', function(req, res, next) {
  console.log(req.body);
  console.log(req.params.deviceId);

  var UserDB = UserDb;

  UserDB.get(req.params.userId, function(value) {
    DeviceDb.get(req.params.deviceId, 
    function(err, data) {
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
