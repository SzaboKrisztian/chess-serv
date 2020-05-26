const WHITE = 0, BLACK = 1;
const PAWN = 1, KNIGHT = 2, KING = 3, BISHOP = 5, ROOK = 6, QUEEN = 7;
const N = 16, NE = 17, E = 1, SE = -15, S = -16, SW = -17, W = -1, NW = 15;
const bishopDirs = [NE, SE, SW, NW];
const knightDirs = [33, 18, -14, -31, -33, -18, 14, 31]; // The knight is a weirdo
const rookDirs = [N, E, S, W];
const queenDirs = [N, NE, E, SE, S, SW, W, NW];
const enPassantBit = 1 << 8;
const castlingBit = 1 << 9;
const promotionBits = 7 << 10;
const promotionOptions = [KNIGHT << 10, BISHOP << 10, ROOK << 10, QUEEN << 10];

// All sliding pieces have the 3rd bit 1 (isSliding = pieceType & 4)
// All sliding pieces have the 1st bit set if they can move diagonally, and the 2nd bit set if they can move horizontally and vertically

module.exports = class Board {
  constructor(state) {
    this.squares = new Array(128).fill(null);
    this.pieces = [];
    state.pieces.forEach((piece) => {
      this.squares[piece.position] = piece;
      this.pieces.push(piece);
    });
    this.currentPlayer = state.currentPlayer;
    this.fiftyMoves = state.fiftyMoves;
    this.kingsideCastle = state.kingsideCastle;
    this.queensideCastle = state.queensideCastle;
    this.enPassant = state.enPassant;
  }

  makeMove(piecePos, move) {
    // Move is encoded as follows: pppce0yyy0xxx
    // The lowest two nibbles represent the position, as usual, as per the 0x88 method
    // The next bit represents whether the move is an en passant capture
    // The next bit represents whether the move is a castling move
    // The highest three bits represent the code of the piece to which a pawn is to be promoted, in the case of the moving a pawn to the last rank
    const result = new Board(this._getState());
    const piece = result.squares[piecePos];
    const moves = this.squares[piecePos].moves;  
    const destination = move & 0x77;
    
    if (piece != null && moves.includes(move)) {
      if ((move & enPassantBit) > 0) {
        // Check if we're doing an en passant capture
        const captured = result.squares[result.enPassant];
        const index = result.pieces.indexOf(captured);
        result.pieces.splice(index, 1);
        result.squares[result.enPassant] = null;
      } else if ((move & castlingBit) > 0) {
        // If we're castling, move the rook to the right square
        const rookPos = piecePos + (piecePos < destination ? 3 * E : 4 * W);
        const rookTarget = piecePos + (piecePos < destination ? E : W);
        const rook = result.squares[rookPos];
        result.squares[rookTarget] = rook;
        rook.position = rookTarget;
        result.squares[rookPos] = null;
        result.kingsideCastle[result.currentPlayer] = false;
        result.queensideCastle[result.currentPlayer] = false;
      } else {
        // Normal move (possibly pawn promotion)
        // Check if we're capturing something
        const target = result.squares[destination];
        if (target !== null) {
          const index = result.pieces.indexOf(target);
          result.pieces.splice(index, 1);
        } else if (piece.type === PAWN) {
          // Check if we're promoting a pawn
          const promotion = (move & promotionBits) >> 10;
          if (promotion > 0) {
            piece.type = promotion;
          } else if (Math.abs(piecePos - destination) === 32) {
            // Check if we need to mark en passant as possible on the next move
            result.enPassant = destination;
          }
        }
      }

      // Disable castling if we have to
      if (result.kingsideCastle[result.currentPlayer] || result.queensideCastle[result.currentPlayer]) {
        if (piece.type === KING) {
          result.kingsideCastle[result.currentPlayer] = false;
          result.queensideCastle[result.currentPlayer] = false;
        } else if (piece.type === ROOK) {
          const king = result.pieces.find((piece) => (piece.owner === result.currentPlayer && piece.type === KING));
          if (piece.position < king.position) {
            result.queensideCastle[result.currentPlayer] = false;
          } else {
            result.kingsideCastle[result.currentPlayer] = false;
          }
        }
      }

      // In all cases, we make the actual move
      result.squares[destination] = piece;
      piece.position = destination;
      result.squares[piecePos] = null;
      result.currentPlayer = result.currentPlayer === WHITE ? BLACK : WHITE;
      return result;
    } else {
      throw 'Illegal move';
    }
  }

  hasLegalMoves() {
    for (let i = 0; i < this.pieces.length; i++) {
      if (this.pieces[i].owner === this.currentPlayer && this.pieces[i].moves.length > 0) {
        return true;
      }
    }
    return false;
  }

  _generateMoves() {
    // Clear the attack board
    this._clearAttacks();

    // Generate all pseudo-legal moves
    this.pieces.forEach((piece) => {
      piece.moves = [];
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
      if (!this.squares[move | 8]) {
        legalKingMoves.push(move);
      }
    });
    king.moves = legalKingMoves;

    // Get the attackers, and remove the last remaining illegal moves for the king.
    const attackers = this._findAttackers(king.position, opponent);
    attackers.forEach((piece) => {
      if (isSlidingPiece(piece)) {
        const direction = getDirection(piece.position, king.position);
        const move = king.position + direction;
        const index = king.moves.indexOf(move);
        if (index !== -1) {
          king.moves.splice(index, 1);
        }
      }
    });

    // Check for check
    if (attackers.length === 1) {
      // Find and remove all moves that don't block the check, or take the checking piece
      this.isKingInCheck = true;
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
      this.isKingInCheck = true;
      currentPlayerPieces.forEach((piece) => {
        if (piece.type !== KING) {
          piece.moves = [];
        }
      });
    } else {
      // The king is not under check in this branch
      // Check to see if king may castle, and add the move/s if so
      this.isKingInCheck = false;
      if (this._mayCastleKingSide(king.position)) {
        let att = this._findAttackers(king.position + E, opponent).concat(this._findAttackers(king.position + (2 * E)));
        if (att.length === 0) {
          king.moves.push(king.position + (2 * E) + castlingBit);
        }
      }
      if (this._mayCastleQueenSide(king.position)) {
        let att = this._findAttackers(king.position + W, opponent).concat(this._findAttackers(king.position + (2 * W)));
        if (att.length === 0) {
          king.moves.push(king.position + (2 * W) + castlingBit);
        }
      }
    }

    // Check and add if there are en passant moves
    if (this.enPassant !== null) {
      // Check to the left and right of the pawn that just moved two ranks
      if (this._canTakeEnPassant(this.enPassant + W)) {
        this.squares[this.enPassant + W].moves.push(this.enPassant + N + enPassantBit);
      } 
      if (this._canTakeEnPassant(this.enPassant + E)) {
        this.squares[this.enPassant + E].moves.push(this.enPassant + N + enPassantBit)
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
          if (this.squares[index] !== null && this.squares[index].owner === this.currentPlayer) {
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
    const lastRank = pawn.owner === WHITE ? 7 : 0;

    // One rank forward
    let destination = pawn.position + direction;
    let firstRankClear = false;
    if (this.squares[destination] === null) {
      firstRankClear = true;
      if (destination !== lastRank) {
        pawn.moves.push(destination);
      } else {
        // Promotion time
        promotionOptions.forEach((promotion) => pawn.moves.push(destination + promotion));
      }
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
          if (piece.owner !== this.currentPlayer) {
            // This is a side-effect of the function!
            // This was the best place to generate the off-board to keep track of attacked squares and at the same time avoid iterating one more time over all enemy pieces.
            this.squares[target | 8] = true;
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

  _clearAttacks() {
    for (let i = 8; i < 128; i++) {
      if ((i & 8) === 0) i += 8;
      this.squares[i] = false;
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
        return result; // The piece is not in line with the destination, return []
      }
      let step = piece.position + direction;
      while (isWithinBounds(step) && step !== destination) {
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

  _getState() {
    const result = {
      "currentPlayer": this.currentPlayer,
      "fiftyMoves": this.fiftyMoves,
      "kingsideCastle": [...this.kingsideCastle],
      "queensideCastle": [...this.queensideCastle],
      "enPassant": this.enPassant
    }
    const pieces = this.pieces.map((piece) => {
      const {type, owner, position} = piece;
      return { "type": type, "owner": owner, "position": position }
    });
    result.pieces = pieces;
    return result;
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
  if (Math.abs(diff) < 7) {
    return diff < 0 ? -1 : 1;
  }
  const result = queenDirs.find((dir) => {
    if (Math.abs(dir) === 1) {
      return false;
    }
    const mod = diff % dir;    
    return ((mod === 0 || mod === -0) && ((diff < 0 && dir < 0) || (diff > 0 && dir > 0)));
  });
  return result;
}

function isSlidingPiece(piece) {
  return (piece.type & 4) > 0;
}

function enemyPiecePresent(board, position, player) {
  return (isWithinBounds(position) && board[position] !== null && board[position].owner !== player);
}