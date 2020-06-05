const Board = require('./board-state');
const standardChess = require('../chess-data/standard-chess.json');
const WHITE = 0, BLACK = 1;
const WHITE_MOVES = -2,
  BLACK_MOVES = -1,
  WHITE_WINS_CHECKMATE = 0,
  BLACK_WINS_CHECKMATE = 1,
  WHITE_WINS_RESIGNATION = 2,
  BLACK_WINS_RESIGNATION = 3,
  DRAW_MATERIAL = 4,
  DRAW_STALEMATE = 5,
  DRAW_FIFTY = 6,
  DRAW_AGREEMENT = 7;

module.exports = class Game {
  constructor(data = undefined) {
    if (data) {
      this.history = data.history.map((b) => new Board(b));
      this.state = data.state;
      this.drawOffer = data.drawOffer;
    } else {
      this._startNewGame();
    }
  }

  makeMove(piecePos, move) {
    const newState = this.getBoard().makeMove(piecePos, move);
    this._changeState(newState);
  }

  getBoard() {
    return this.history[this.history.length - 1];
  }

  _startNewGame() {
    this.history = []
    this._changeState(standardChess);
    this.drawOffer = -1;
  }

  _changeState(state) {
    const newBoard = new Board(state);
    newBoard._generateMoves();
    this.history.push(newBoard);
    this.state = this._getState();
    this.drawOffer = -1;
  }

  _getState() {
    const board = this.getBoard();
    if (board.hasLegalMoves()) {
      if (board.fiftyMoves > 100) {
        return DRAW_FIFTY;
      } else if (!board.enoughMaterial()) {
        return DRAW_MATERIAL;
      } else {
        return board.currentPlayer === WHITE ? WHITE_MOVES : BLACK_MOVES;
      }
    } else if (board.isKingInCheck) {
      return board.currentPlayer === WHITE ? BLACK_WINS_CHECKMATE : WHITE_WINS_CHECKMATE;
    } else {
      return DRAW_STALEMATE;
    }
  }
}