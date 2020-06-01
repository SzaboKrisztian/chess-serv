const { Model } = require('objection');

class Message extends Model {
  static tableName = 'messages';

  static get relationMappings() {
    const User = require('./User');
    const Game = require('./Game');
    return {
      author: {
        relation: Model.BelongsToOneRelation, 
        modelClass: User,
        join: {
          from: 'messages.authorId',
          to: 'users.id'
        }
      },
      game: {
        relation: Model.BelongsToOneRelation,
        modelClass: Game,
        join: {
          from: 'messages.gameId',
          to: 'games.id'
        }
      }
    }
  }
}

module.exports = Message;