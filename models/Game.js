const { Model } = require('objection');

class Game extends Model {
  static tableName = 'games';
}

module.exports = Game;