Pusher.log = function(msg) {
  console.log(msg);
};


var endpoint = "/auth";
var APP_KEY = '599cb5ed77cd5efb659a';
var pusher = new Pusher(APP_KEY, {
	authEndpoint: endpoint,
	encrypted: true
});	

var channel = pusher.subscribe('private-rpi2');

channel.bind('pusher:subscription_succeeded', function() {
  sendPusherMessage({name:"Hello pi", payload:"", command:[]});
});

channel.bind('client-talk', function(data) {

  console.log('data');	
  console.log(data);

  timeOfLatestBeep = new Date().getTime();

  if(data.message == 'beep') {
  } else {
    $('#status-message').html('<div>' +data.message + '</div>');
  }

});


console.log("Hello world");
console.log(pusher);

$(document).ready(function() {
  document.body.innerHTML += '<div id="messages"></div>';
	getCommands();

  window.setTimeout(refreshConnectionStatus, 3000);
sendPusherMessage('ping');
});

var timeOfLatestBeep = 0;
var refreshConnectionStatus = function() {
  var timeSinceBeep = new Date().getTime() - timeOfLatestBeep;
  if(timeSinceBeep > 30000) {
    $('.status.connection').removeClass('green');
    $('.status.connection').addClass('red');
  } else {
    $('.status.connection').removeClass('red');
    $('.status.connection').addClass('green');
  }

  window.setTimeout(refreshConnectionStatus, 3000);
}

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
    var item = '<div class="button-holder">' 
    + '<button onClick="send(' + i + ')">' + o.name + '</button>'
    + '</div>';

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