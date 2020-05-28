const { Model } = require('objection');


class Token extends Model {
  static tableName = 'tokens';

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: Model.BelongsToOneRelation, 
        modelClass: User,
        join: {
          from: 'tokens.userId',
          to: 'users.id'
        }
      }
    }
  }
}

module.exports = Token;