

var pusher;
var channel;

Pusher.log = function(msg) {
  //console.log(msg);
};

var initPusher = function(deviceId, channelName, appKey, endpoint) {
  var auth = { params: {deviceToken: deviceId} };
  console.log('init pusher with');
  console.log(auth);

  pusher = new Pusher(appKey, {
  	authEndpoint: endpoint,
    auth: auth,
  	encrypted: true
  });


  channel = pusher.subscribe(channelName);

  channel.bind('pusher:subscription_succeeded', function() {
    sendPusherMessage({name:"Hello pi", payload:"", command:[]});
  });

  channel.bind('client-talk', onMessage); 

  sendPusherMessage('ping');
}

var sendPusherMessage = function(data) {
  console.log(data);
  var message = {message: JSON.stringify(data)};
  channel.trigger("client-talk", message);
}


var onMessage = function(data) {
 console.log('data'); 
  console.log(data);

  timeOfLatestBeep = new Date().getTime();

  if(data.message == 'beep') {
  } else {
    $('#status-message').html('<div>' +data.message + '</div>');
  }
};


// Read a page's GET URL variables and return them as an associative array.
function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

$(document).ready(function() {
  document.body.innerHTML += '<div id="messages"></div>';
	getCommands();
  var queryParams = getUrlVars();
  console.log(queryParams);
  window.setInterval(refreshConnectionStatus, 3000);
});

var timeOfLatestBeep = 0;
var refreshConnectionStatus = function() {
  var timeSinceBeep = new Date().getTime() - timeOfLatestBeep;
  if(timeSinceBeep > 30000) {
    $('.status-bar').addClass('red');
  } else {
    $('.status-bar').removeClass('red');
  }

}

var getCommands = function() {
	$.get('/command', function(data) {
    console.log(data)
		htmlFormatCommands(data, function(htmlButtons) {
			htmlButtons.forEach(function(item) {
				$('#messages').append(item);
			});
		});
	});
}

function htmlFormatCommands(body, callback) {
  var command = body;
  var i = 0;
  var result = command.map(function(o) {
    var item = '<div class="command-holder">' 
    + '<button class="command" onClick="send(' + i + ')">' + o.name + '</button>'
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

