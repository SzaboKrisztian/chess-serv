const { Model } = require('objection');

class Message extends Model {
  static tableName = 'messages';

  static get relationMappings() {
    const Game = require('./Game');
    return {
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