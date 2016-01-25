
var Sequelize = require('sequelize');
var uuid4 = require('uuid4');

function createUUID() {
  return uuid4().split('-').join('');
}

function init() {
  var sequelize = new Sequelize('postgres://simarv:yknxIsWwG053O8vm@live01.c9gmytn7bxez.eu-central-1.rds.amazonaws.com:5432/postgres');
  return sequelize;
}

function model(callback) {
  var sequelize = init();
  var data = sequelize.define('device', {
   uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
      },
    ip: Sequelize.CHAR,
    value: Sequelize.JSONB
  });
  callback(data);
}

exports.get = function(id, callback) {
  model(function(handle) {
    handle.findOne({where: {uuid: id}}).then(function(data) {
      if(data) {
        result = {
          id: id,
          exist: true,
          config: data.value
        };
        result.config.auth_endpoint = '/auth';
        console.log(result)
        callback(null, result);
      } else {
        console.log('missing: ' +id);
        callback(null, {id: id, exist: false})
      }
    });
  });
}

exports.create = function(data, callback) {
  console.log(data);
  model(function(handle) {
    var uuid = createUUID();
    var ip = '';
    var value = {
      channel_name: 'private-' +createUUID(),
      pusher_key: '599cb5ed77cd5efb659a',
      heartbeat_interval_in_seconds: 60,
      auth_endpoint: '/auth',
      available_for_pairing: true
    };

    handle.upsert({uuid: uuid, ip: ip, value: value, createdAt: new Date(), updatedAt: new Date()}).then(function(d){
      result = {
        id: uuid,
        config: value
      };
      console.log(result); 
      callback(null, result);
    });
  });
}
