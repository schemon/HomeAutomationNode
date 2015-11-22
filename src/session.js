
var Sequelize = require('sequelize');

function init() {
  var sequelize = new Sequelize('postgres://simarv:yknxIsWwG053O8vm@live01.c9gmytn7bxez.eu-central-1.rds.amazonaws.com:5432/postgres');
  return sequelize;
}

function model(modelName, callback) {
  var sequelize = init();
  var data = sequelize.define(modelName, {
    value: Sequelize.JSONB
  });
  data.sync().then(callback(data));
}

exports.get = function(id, callback) {
  model(modelName, function(handle) {
    handle.findOne({where: {id: id}}).then(function(data) {
      callback(data);
    });
  });
}

exports.create = function(id, data, callback) {
  console.log(data);
  model(modelName, function(handle) {
    handle.upsert({id: id, value: data} ).then(callback);
  });
}
