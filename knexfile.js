const credentials = require("./config/mysql_cred").credentials;
const { knexSnakeCaseMappers } = require('objection');

module.exports = {

  development: {
    client: 'mysql',
    connection: credentials,
    ...knexSnakeCaseMappers()
  }

};
