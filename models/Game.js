const { Model } = require('objection');

class Game extends Model {
  static tableName = 'games';

  static get relationMappings() {
    const Message = require('./Message');
    return {
      messages: {
        relation: Model.HasManyRelation, 
        modelClass: Message,
        join: {
          from: 'messages.gameId',
          to: 'games.id'
        }
      }
    }
  }
}

module.exports = Game;