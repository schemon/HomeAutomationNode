var restify = require('restify');
var fs = require('fs');
var https = require('https');
var request = require('request');

var auth = require('./auth_endpoint.js')

var server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.acceptParser(server.acceptable));

server.use(function sessionParser(req, res, next) {
  console.log(req.params.sid);

  if(req.params.sid) {
    var SimpleStore = require('./simple_store');
    SimpleStore.get('session', req.params.sid, function(data) {
      if(data && data.devieId) {
        req.deviceId = data.deviceId;
      }
      next();
    });
  } else {
    next();
  }

});

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
    console.log(item);
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
	fs.readFile('./client.html', function (err, html) {
    if (err) {
        throw err; 
    }

		res.setHeader('Content-Type', 'text/html');
		res.writeHead(200);
		res.end(html);
		next();
	});
}

function script(req, res, next) {
	console.log(req.params);
	fs.readFile('./' + req.params.res, function (err, content) {
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

var DeviceDb = require('./device_db');

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


server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
