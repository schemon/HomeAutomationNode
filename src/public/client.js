
$(document).ready(function() {
  $.get('/device', function(devices) {
    console.log(devices)
    devices = devices.filter(function(value) {
      return value.exist
    });

    var device = devices[0]
    initPusher(
      device.id, 
      device.config.channel_name, 
      device.config.pusher_key, 
      device.config.auth_endpoint);
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
  refreshDeviceDependentViews();


  $('#connect-device-to-facebook').click(function() {
    window.location.replace('http://huvuddator.ddns.net/connect/device/' +$('#device-id').val());
  });

});

function refreshDeviceDependentViews() {
  if(deviceData) {
    $('#status').append('Found nearby device');
    $('#device-id').val(deviceData.id);      
  }
}

