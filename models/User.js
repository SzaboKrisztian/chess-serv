const { Model } = require('objection');
const Role = require('./Role');
const Token = require('./Token');

class User extends Model {
  static get tableName() {
    return 'users';
  }

  static relationMappings = {
    role: {
      relation: Model.BelongsToOneRelation, 
      modelClass: Role,
      join: {
        from: 'users.roleId',
        to: 'roles.id'
      }
    },
    
    tokens: {
      relation: Model.HasManyRelation,
      modelClass: Token,
      join: {
        from: 'users.id',
        to: 'tokens.userId'
      }
    }
  }
}

module.exports = User;