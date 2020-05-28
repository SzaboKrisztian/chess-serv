const { Model } = require('objection');

class Role extends Model {
  static tableName = 'roles';

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: Model.HasManyRelation, 
        modelClass: User,
        join: {
          from: 'roles.id',
          to: 'users.roleId'
        }
      }
    }
  }
}

module.exports = Role;