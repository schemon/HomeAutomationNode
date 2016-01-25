var Pusher = require('pusher');

var APP_ID = '134441';
var APP_KEY = '599cb5ed77cd5efb659a';
var APP_SECRET = '76a57ea82e311bcbbb1f';

exports.auth = function(req, res, next) {
  console.log('pusher auth userId: ' +req.userId);


  var pusher = new Pusher({ appId: APP_ID, key: APP_KEY, secret:  APP_SECRET });
  var response = pusher.authenticate(req.params.socket_id, req.params.channel_name);

  console.log(response);
  res.send(response);
  next();
}

var isValid = function(fbToken) {

}