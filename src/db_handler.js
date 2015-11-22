var Sequelize = require('sequelize');

var sequelize = new Sequelize('postgres://simarv:yknxIsWwG053O8vm@live01.c9gmytn7bxez.eu-central-1.rds.amazonaws.com:5432/postgres');

var User = sequelize.define('person', {
  firstName: {
    type: Sequelize.STRING,
    field: 'first_name' // Will result in an attribute that is firstName when user facing but first_name in the database
  },
  lastName: {
    type: Sequelize.STRING
  }
}, {
  freezeTableName: true // Model tableName will be the same as the model name
});

User.sync({force: false}).then(function () {
  // Table created
  console.log("synced");
  return User.create({
    firstName: 'John',
    lastName: 'Hancock'
  });
});

