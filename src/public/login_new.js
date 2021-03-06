$(document).ready(function() {
  $('#fb-login-button').click(function() {
    FB.login(function(auth) {
      console.log(auth);
      statusChangeCallback(auth);
    });
  });
  $('#fb-logout-button').click(function() {
    FB.logout(function(auth) {
      console.log(auth);
      statusChangeCallback(auth);
    });
  });

  checkLoginState();
});

$(document).ready(function() {
  $('#login-as-guest').click(function() {
    window.location.replace('http://huvuddator.ddns.net/login/guest/device/' +$('#device-id').val());
  });
});


var deviceData;

function parseResponse(data) {
  if(data.id) {
    $.get('/device/' +data.id, function(resp) {
      deviceData = data;
      refreshDeviceDependentViews();
    });
  }
}

$(document).ready(function() {
  window.fbAsyncInit();
  refreshDeviceDependentViews();
});

function refreshDeviceDependentViews() {
  if(deviceData) {
    $('#status').append('Found nearby device');
    $('#device-id').val(deviceData.id);      
  }
}


 // This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
  console.log('statusChangeCallback');
  console.log(response);
  // The response object is returned with a status field that lets the
  // app know the current login status of the person.
  // Full docs on the response object can be found in the documentation
  // for FB.getLoginStatus().

  if (response.status === 'connected') {
    // Logged into your app and Facebook.
    var credentials = { fbToken: response.authResponse.accessToken };
    window.location.replace('http://huvuddator.ddns.net/login/fb/' + credentials.fbToken);

    testAPI();
  } else {
    // The person is not logged into Facebook, so we're not sure if
    // they are logged into this app or not.
    document.getElementById('status').innerHTML = 'Please log ' +'into Facebook.';

      var queryParams = getUrlVars();
      console.log(queryParams['deviceToken']);
      credentials = {deviceToken: queryParams['deviceToken'] };
  }

}


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

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState() {
  FB.getLoginStatus(function(response) {
    console.log(response);
  });
}

window.fbAsyncInit = function() {
  FB.init({
    appId      : '1519713668353392',
    xfbml      : true,
    version    : 'v2.5'
  });

// Now that we've initialized the JavaScript SDK, we call 
// FB.getLoginStatus().  This function gets the state of the
// person visiting this page and can return one of three states to
// the callback you provide.  They can be:
//
// 1. Logged into your app ('connected')
// 2. Logged into Facebook, but not your app ('not_authorized')
// 3. Not logged into Facebook and can't tell if they are logged into
//    your app or not.
//
// These three cases are handled in the callback function.

};

/*
// Load the SDK asynchronously
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
*/


// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
function testAPI() {
  console.log('Welcome!  Fetching your information.... ');
  FB.api('/me', function(response) {
    console.log('Successful login for: ' + response.name);
    document.getElementById('status').innerHTML = response.name;
  });
}
