Pusher.log = function(msg) {
  console.log(msg);
};

//var endpoint = 'http://requestb.in/190mjk51';
var endpoint = "/auth";
var APP_KEY = '599cb5ed77cd5efb659a';
var pusher = new Pusher(APP_KEY, {
	authEndpoint: endpoint,
	encrypted: true
});	

var channel = pusher.subscribe('private-rpi2');
channel.bind('client-talk',
function(data) {

  console.log('data');	
  console.log(data);

  $('#messages').append('<div>' +data.message + '</div>');
});

console.log("Hello world");
console.log(pusher);

$(document).ready(function() {
  document.body.innerHTML += '<div id="messages"></div>';
	getCommands();
});


var getCommands = function() {
	$.get('/command', function(data) {
		htmlFormatCommands(data, function(htmlButtons) {
			htmlButtons.forEach(function(item) {
  			console.log(item);
				$('#messages').append(item);
			});
		});
	});
}

function htmlFormatCommands(body, callback) {
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

var sendPusherMessage = function(data) {
	console.log(data);
	var message = {message: JSON.stringify(data)};
	channel.trigger("client-talk", message);
}