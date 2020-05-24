const standardChess = require('./standard_chess.json');
const WHITE = 0, BLACK = 1;
const PAWN = 1, KNIGHT = 2, KING = 3, BISHOP = 5, ROOK = 6, QUEEN = 7;
const N = 16, NE = 17, E = 1, SE = -15, S = -16, SW = -17, W = -1, NW = 15;
const bishopDirs = [NE, SE, SW, NW];
const knightDirs = [33, 18, -14, -31, -33, -18, 14, 31]; // The knight is a weirdo
const rookDirs = [N, E, S, W];
const queenDirs = [N, NE, E, SE, S, SW, W, NW];

// All sliding pieces have the 3rd bit 1 (isSliding = pieceType & 4)
// All sliding pieces have the 1st bit set if they can move diagonally, and the 2nd bit set if they can move horizontally and vertically

module.exports = class Board {
  constructor(state) {
    this.squares = new Array(128).fill(null);
    this.pieces = [];
    state.board.forEach((piece) => {
      piece.moves = [];
      this.squares[piece.position] = piece;
      this.pieces.push(piece);
    });
    this.currentPlayer = state.currentPlayer;
    this.fiftyMoves = state.fiftyMoves;
    this.kingsideCastle = state.kingsideCastle;
    this.queensideCastle = state.queensideCastle;
    this.enPassant = state.enPassant;
    this._generateMoves();
  }

  static newGame() {
    return new Board(standardChess);
  }

  _generateMoves() {
    // Generate all pseudo-legal moves
    this.pieces.forEach((piece) => {
      switch (piece.type) {
        case PAWN:
          this._generatePawnMoves(piece);
          break;
        case BISHOP:
          this._generatePieceMoves(piece, bishopDirs, 0);
          break;
        case KNIGHT:          
          this._generatePieceMoves(piece, knightDirs, 1);
          break;
        case ROOK:
          this._generatePieceMoves(piece, rookDirs, 0);
          break;
        case QUEEN:
          this._generatePieceMoves(piece, queenDirs, 0);
          break;
        case KING:
          this._generatePieceMoves(piece, queenDirs, 1);
          break;
      }
    });

    const currentPlayerPieces = this.pieces.filter((piece) => (piece.owner === this.currentPlayer));
    const opponent = this.currentPlayer === WHITE ? BLACK : WHITE;
    const opponentPieces = this.pieces.filter((piece) => (piece.owner === opponent));
    const king = currentPlayerPieces.find((piece) => (piece.type === KING));
    
    // Remove all the king's moves that would put him in check
    const legalKingMoves = [];
    king.moves.forEach((move) => {
      if (this._findAttackers(move, opponent).length === 0) {
        legalKingMoves.push(move);
      }
    });
    king.moves = legalKingMoves;

    // Check for check
    const attackers = this._findAttackers(king.position, opponent);
    if (attackers.length === 1) {
      // Find and remove all moves that don't block the check, or take the checking piece
      const attacker = attackers[0];
      const vector = this._findAttackVector(attacker, king.position);
      
      currentPlayerPieces.forEach((piece) => {
        // At this point all the king's moves are legal, so we just skip him
        if (piece.type !== KING) {
          const legalMoves = [];
          piece.moves.forEach((move) => {
            if (move === attacker.position || vector.includes(move)) {
              legalMoves.push(move);
            }
          });
          piece.moves = legalMoves;
        }
      });
    } else if (attackers.length > 1) {
      // Remove all moves except for the king's moves that get him out of check
      currentPlayerPieces.forEach((piece) => {
        if (piece.type !== KING) {
          piece.moves = [];
        }
      });
    } else {
      // The king is not under check in this branch
      // Check to see if king may castle, and add the move/s if so
      if (this._mayCastleKingSide(king.position)) {
        king.moves.push(king.position + (2 * E));
      }
      if (this._mayCastleQueenSide(king.position)) {
        king.moves.push(king.position + (2 * W));
      }
    }

    // Check and add if there is an en passant move
    if (this.enPassant !== null) {
      // Check to the left and right of the pawn that just moved two ranks
      if (this._canTakeEnPassant(this.enPassant + W)) {
        this.squares[this.enPassant + W].moves.push(this.enPassant + N);
      } 
      if (this._canTakeEnPassant(this.enPassant + E)) {
        this.squares[this.enPassant + E].moves.push(this.enPassant + N)
      }
    }

    // Remove illegal moves for any pinned pieces
    const opponentSliders = opponentPieces.filter((piece) => (isSlidingPiece(piece)));
    opponentSliders.forEach((piece) => {
      const vector = this._findAttackVector(piece, king.position);
      if (vector.length > 0) {
        // The piece and the king are in line, with a least one square separating them
        let potentiallyPinned = [];
        vector.forEach((index) => {
          if (this.squares[index] !== null) {
            potentiallyPinned.push(this.squares[index]);
          }
        });
        
        if (potentiallyPinned.length === 1 && potentiallyPinned[0].owner === this.currentPlayer) {
          // The case of there being a single piece between the attacker and the king means that the piece is pinned.
          const pinnedPiece = potentiallyPinned[0];
          const legalMoves = [];
          pinnedPiece.moves.forEach((move) => {
            if (move === piece.position || vector.includes(move)) {
              legalMoves.push(move);
            }
          });
          pinnedPiece.moves = legalMoves;
        } else if (this.enPassant !== null && potentiallyPinned.length === 2 && potentiallyPinned.every((piece) => (piece.type === PAWN))) {
          // This is an edge case where there's exactly two pawns between the attacker and the king, and one of them just moved two ranks. There's a particular layout of these pieces that blocks the otherwise legal en passant capture.
          let step = piece.position;
          const direction = getDirection(piece.position, king.position);
          do {
            step += direction;
          } while (this.squares[step] === null);
          const firstPawn = this.squares[step];
          if (firstPawn.owner === this.currentPlayer) {
            const secondPawn = this.squares[step + direction];
            if (secondPawn.owner === opponent && secondPawn.position === this.enPassant) {
              firstPawn.moves.splice(firstPawn.moves.indexOf(this.enPassant + N), 1);
            }
          }
        }
      }
    });

    // Clear all the opponent's moves
    opponentPieces.forEach((piece) => (piece.moves = []));
  }

  _generatePawnMoves(pawn) {
    const direction = pawn.owner === WHITE ? N : S;
    const startRank = pawn.owner === WHITE ? 1 : 6;

    // One rank forward
    let destination = pawn.position + direction;
    let firstRankClear = false;
    if (this.squares[destination] === null) {
      firstRankClear = true;
      pawn.moves.push(destination);
    }

    // Two rank opening move
    destination = pawn.position + (2 * direction);
    if (firstRankClear && ((pawn.position & 0x70) >> 4) === startRank && this.squares[destination] === null) {
      pawn.moves.push(destination);
    }

    // Capture moves
    destination = pawn.position + direction - 1;
    if (enemyPiecePresent(this.squares, destination, pawn.owner)) {
      pawn.moves.push(destination);
    }
    destination = pawn.position + direction + 1;
    if (enemyPiecePresent(this.squares, destination, pawn.owner)) {
      pawn.moves.push(destination);
    }
  }

  _generatePieceMoves(piece, directions, limit) {
    limit = limit === 0 ? 99 : limit;
    for (let i = 0; i < directions.length; i++) {
      let target = piece.position;
      let dist = 0;
      while (dist < limit) {
        target += directions[i];
        if (isWithinBounds(target)) {
          const current = this.squares[target];
          if (current === null || current.owner !== piece.owner) {
            piece.moves.push(target);
          }
          if (current !== null) {
            break;
          }
        } else {
          break;
        }
        dist++;
      }
    }
  }

  _findAttackers(destination, player) {
    // Player is the attacking player
    return this.pieces.filter((piece) => {
      if (piece.owner === player) {
        if (piece.type === PAWN) {
          // For the pawn, only the diagonal moves are attacks.
          // With other words, forward moves are not attacks.
          return destination === piece.position + NE ||
                 destination === piece.position + SE ||
                 destination === piece.position + SW ||
                 destination === piece.position + NW;
        }
        return piece.moves.includes(destination);
      }
    });
  }

  _findAttackVector(piece, destination) {
    const result = [];
    if (isSlidingPiece(piece)) {
      let validDirections;
      switch (piece.type) {
        case BISHOP:
          validDirections = bishopDirs;
          break;
        case ROOK:
          validDirections = rookDirs;
          break;
        case QUEEN:
          validDirections = queenDirs;
          break;
      }
      const direction = getDirection(piece.position, destination);
      if (direction === undefined || !validDirections.includes(direction)) {
        return result; // The piece is not in line with the destination
      }
      let step = piece.position + direction;
      while (step !== destination) {
        result.push(step);
        step += direction;
      }
    }
    return result;
  }

  _canTakeEnPassant(square) {
    if (isWithinBounds(square)) {
      const piece = this.squares[square];
      return piece !== null && piece.owner === this.currentPlayer && piece.type === PAWN;
    }
  }

  _mayCastleKingSide(kingPosition) {
    return this.kingsideCastle[this.currentPlayer] && this.squares[kingPosition + E] === null && this.squares[kingPosition + (2 * E)] === null;
  }

  _mayCastleQueenSide(kingPosition) {
    return this.queensideCastle[this.currentPlayer] && this.squares[kingPosition + W] === null && this.squares[kingPosition + (2 * W)] === null && this.squares[kingPosition + (3 * W)] === null;
  }
}

function isWithinBounds(index) {
  if (index >= 0 && index < 128) {
    return (index & 0x88) === 0;
  }
  return false;
}

function getDirection(source, destination) {
  const diff = destination - source;
  return queenDirs.find((dir) => {
    const mod = diff % dir;
    return ((mod === 0 || mod === -0) && ((diff < 0 && dir < 0) || (diff > 0 && dir > 0)));
  });
}

function isSlidingPiece(piece) {
  return (piece.type & 4) > 0;
}

function enemyPiecePresent(board, position, player) {
  return (isWithinBounds(position) && board[position] !== null && board[position].owner !== player);
}

function coordToIndex(x, y) {
  if (x >= 0 && y >= 0 && x <= 7 && y <= 7) {
    return (y << 4) | x;
  } else {
    throw 'Coordinate out of bounds [0..7]';
  }
}

function indexToCoord(index) {
  if (index >= 0 && index < 128) {
    return [(index & 0x07), (index & 0x70) >> 4];
  } else {
    throw 'Index out of bounds [0..127]';
  }
}

function algToIndex(algebraic) {
  let x = algebraic.toLowerCase().codePointAt(0) - 97;
  let y = algebraic.codePointAt(1) - 49;
  return getIndex(x, y);
}

function indexToAlg(index) {
  const x = index & 0x07;
  const y = (index & 0x70) >> 4;
  return String.fromCharCode([x + 97, y + 49]);
}