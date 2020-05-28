const { Model } = require('objection');

class Invitation extends Model {
  static tableName = 'invitations';

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: Model.BelongsToOneRelation, 
        modelClass: User,
        join: {
          from: 'invitations.inviter',
          to: 'users.id'
        }
      }
    }
  }
}

module.exports = Invitation;