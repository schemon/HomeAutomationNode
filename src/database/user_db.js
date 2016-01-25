
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
  var data = sequelize.define('user', {
   uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
      },
    ip: Sequelize.CHAR,
    value: Sequelize.JSONB
  });
  data.sync().then(callback(data));
}

exports.get = function(id, callback, onMissing) {
  getOne({uuid: id}, callback, onMissing);
}

exports.getFromFacebookId = function(fbId, callback, onMissing) {
  getOne({value: {fb: {id: fbId}}}, callback, onMissing);
}

function getOne(where, callback, onMissing) {
    model(function(handle) {
    handle.findOne({where: where}).then(function(data) {
      if(data) {
        callback({
          id: data.uuid.split('-').join(''),
          value: data.value
        });
      } else {
        if(onMissing) {
          onMissing();
        }
      }
    });
  });
}

exports.create = function(callback) {
  model(function(handle) {
    var uuid = createUUID();
    var ip = '';
    var value = {
      device: []
    };

    handle.upsert({uuid: uuid, ip: ip, value: value, createdAt: new Date(), updatedAt: new Date()}).then(function(d){
      result = {
        id: uuid,
        value: value,
      };
      console.log(result); 
      callback(result);
    });
  });
}

exports.update = function(id, value, callback) {
  console.log("Updating" +value +" to " +id);
  model(function(handle) {
    handle.upsert({uuid: id, value: value}).then(function(d) {
      callback(true);
    });
  });
}


