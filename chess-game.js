const Board = require('./board-state');
const standardChess = require('./standard-chess.json');
const WHITE = 0, BLACK = 1;
const PLAYING = -1, WHITE_WINS = 0, BLACK_WINS = 1, DRAW = 2;

module.exports = class Game {
  constructor(initialState = standardChess) {
    this.history = [];
    this._changeState(initialState);
  }

  makeMove(piecePos, move) {
    try {
      const newState = this.board.makeMove(piecePos, move);
      this._changeState(newState);
    } catch (error) {
      throw error;
    }
  }

  _changeState(state) {
    this.board = new Board(state);
    this.history.push(this.board);
    this.board._generateMoves();
    this.state = this._getState();
  }

  _getState() {
    if (this.board.hasLegalMoves()) {
      return PLAYING;
    } else if (this.board.isKingInCheck) {
      return this.board.currentPlayer === WHITE ? BLACK_WINS : WHITE_WINS;
    } else {
      return DRAW;
    }
  }
}