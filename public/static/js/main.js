$(() => {
  /** General references */
  let host;
  console.log(window.location.origin);
  
  if (window.location.origin.split(':').length > 2) {
    host = window.location.origin.substr(0, window.location.origin.lastIndexOf(':'));
  }
  host += ':3310/';
  console.log(host);
  const socket = io(host);
  let username = "";
  const gameModal = $('#game-modal');
  const gameModalTitle = $('#game-modal-title');
  const gameModalText = $('#game-modal-text');
  const gameModalYesBtn = $('#game-modal-yes-btn');
  const gameModalNoBtn = $('#game-modal-no-btn');
  const games = [];
  const gameChats = [];
  let gameIdToDisplay = null;

  /** Board references */
  const canvas = document.getElementById("board");
  const cellSize = canvas.height / 8;
  const b_pawn = document.getElementById("b_pawn");
  const b_knight = document.getElementById("b_knight");
  const b_bishop = document.getElementById("b_bishop");
  const b_rook = document.getElementById("b_rook");
  const b_queen = document.getElementById("b_queen");
  const b_king = document.getElementById("b_king");
  const w_pawn = document.getElementById("w_pawn");
  const w_knight = document.getElementById("w_knight");
  const w_bishop = document.getElementById("w_bishop");
  const w_rook = document.getElementById("w_rook");
  const w_queen = document.getElementById("w_queen");
  const w_king = document.getElementById("w_king");
  const board_bg = document.getElementById("board_bg");
  const move_img = document.getElementById("move");
  const ctx = canvas.getContext("2d");
  let currentGame = null;
  let selection = null;
  let promotionMove = null;

  function drawBoard() {
    const history = currentGame.obj.history;
    const board = history[history.length - 1];
    ctx.drawImage(board_bg, 0, 0);
    if (board !== null) {
      const isPlayingBlack = currentGame.meta.blackUser === username;
      board.pieces.forEach((piece) => {
        if ((piece.position & 0x88) === 0) {
          let x = piece.position & 0x07;
          let y = 7 - ((piece.position & 0x70) >> 4);
          if (isPlayingBlack) {
            x = 7 - x;
            y = 7 - y;
          }
          const img = getPieceGfx(piece);
          ctx.drawImage(img, 0, 0, img.width, img.height, x * cellSize, y * cellSize, cellSize, cellSize);
        }
      });
      if (selection !== null) {
        selection.moves.forEach((move) => {
          let x = move & 0x07;
          let y = 7 - ((move & 0x70) >> 4);
          if (isPlayingBlack) {
            x = 7 - x;
            y = 7 - y;
          }
          ctx.drawImage(move_img, 0, 0, move_img.width, move_img.height, x * cellSize, y * cellSize, cellSize, cellSize);
        });
      }
      if (promotionMove !== null) {
        ctx.fillStyle = '#6666ff';
        const promotionBoxX = canvas.width / 2 - (2 * cellSize);
        const promotionBoxY = canvas.height / 2 - (cellSize / 2);
        ctx.fillRect(promotionBoxX, promotionBoxY , 4 * cellSize, cellSize);
        const options = isPlayingBlack ? [b_knight, b_bishop, b_rook, b_queen] : [w_knight, w_bishop, w_rook, w_queen];
        for (let i = 0; i < options.length; i++) {
          const img = options[i];
          ctx.drawImage(img, 0, 0, img.width, img.height, promotionBoxX + (i * cellSize), promotionBoxY, cellSize, cellSize);
        }
      }
    }
  }

  function getPieceGfx(piece) {
    switch (piece.type) {
      case 1:
        return piece.owner === 0 ? w_pawn : b_pawn;
      case 2:
        return piece.owner === 0 ? w_knight : b_knight;
      case 3:
        return piece.owner === 0 ? w_king : b_king;
      case 5:
        return piece.owner === 0 ? w_bishop : b_bishop;
      case 6:
        return piece.owner === 0 ? w_rook : b_rook;
      case 7:
        return piece.owner === 0 ? w_queen : b_queen;
    }
  }

  $('#board').click((event) => {
    const history = currentGame.obj.history;
    const board = history[history.length - 1];
    const gameId = currentGame.meta.id;
    const isPlayingBlack = currentGame.meta.blackUser === username;
    if (isItMyTurn() && (currentGame.meta.status === -2 || currentGame.meta.status === -1)) {
      const rect = canvas.getBoundingClientRect();
      const cellH = rect.width / 8.0;
      let x = Math.floor((event.clientX - rect.left) / cellH);
      let y = 7 - Math.floor((event.clientY - rect.top) / cellH);      
      const clickedSquareIndex = isPlayingBlack ? ((7 - y) << 4) + (7 - x) : (y << 4) + x;
      if (promotionMove !== null) {
        const promoX = rect.width / 2 - (2 * cellH);
        const promoY = rect.height / 2 - (cellH / 2);
        const promoW = 4 * cellH;
        const promoH = cellH;
        const clickX = (event.clientX - rect.left);
        const clickY = (event.clientY - rect.top);
        if (clickX < promoX || clickX > (promoX + promoW) || clickY < promoY || clickY > promoY + promoH) {
          promotionMove = null;
        } else {
          const promoSelection = Math.floor((clickX - promoX) / cellH);
          let option = -1;
          switch (promoSelection) {
            case 0:
              option = 2 << 10; // Knight promotion bits
              break;
            case 1:
              option = 5 << 10; // Bishop promotion bits
              break;
            case 2:
              option = 6 << 10; // Rook promotion bits
              break;
            case 3:
              option = 7 << 10; // Queen promotion bits
              break;
          }
          console.log(promoSelection, option);
          
          if (option !== -1) {
            const promoMove = promotionMove | option;
            console.log(promoMove, selection.moves);
            
            if (selection.moves.includes(promoMove)) {
              socket.emit('game', {
                gameId: gameId,
                action: "move",
                piecePosition: selection.position,
                move: promoMove
              });
              promotionMove = null;
            }
          }
        }
      } else if (selection !== null) {
        if (isPromotionMove(selection, clickedSquareIndex)) {
          promotionMove = clickedSquareIndex;
        } else {
          const validMove = selection.moves.find((move) => ((move & 0xff) === clickedSquareIndex));
          if (validMove) {
            socket.emit('game', {
              gameId: gameId,
              action: "move",
              piecePosition: selection.position,
              move: validMove
            });
          
          } else if (board.squares[clickedSquareIndex] !== null) {
            if (board.squares[clickedSquareIndex] !== selection) {
              selection = board.squares[clickedSquareIndex];
            } else {
              selection = null;
            }
          } else {
            selection = null;
          }
        }
      } else {
        selection = board.squares[clickedSquareIndex];
      }
      drawBoard();
    }
  });

  function isPromotionMove(selection, move) {
    if (selection.type === 1 && (move & 0x88) === 0) {
      const lastRank = selection.owner === 0 ? 7 : 0;
      return ((move & 0x70) >> 4) === lastRank;
    }
    return false;
  }

  $('#show-lobby-btn').click(() => {
    const lobby = $('#lobby');
    const game = $('#game');
    if (lobby.css('display') === 'none') {
      game.css('display', 'none');
      lobby.css('display', '');
    }
  });

  function submit() {
    const message = $('#chat-input').val();
    if (message !== "") {
      socket.emit('lobby message', { content: message });
    }
    $('#chat-input').val("");
  }

  $('#chat-submit-btn').click(() => submit());

  $('#chat-input').keypress((key) => {
    if (key.which === 13) {
      submit();
    }
  });

  function submitGameChat() {
    const message = $('#game-chat-input').val();
    if (message !== "") {
      socket.emit('game', {
        action: "send message",
        gameId: currentGame.meta.id,
        message: message
      });
      $('#game-chat-input').val("");
    }
  }

  $('#game-chat-submit-btn').click(() => submitGameChat());

  $('#game-chat-input').keypress((key) => {
    if (key.which === 13) {
      submitGameChat();
    }
  });

  function formatTime(timestamp) {
    const moment = new Date(timestamp);
    return `${moment.getHours() < 10 ? "0" + moment.getHours() : moment.getHours()}:${moment.getMinutes() < 10 ? "0" + moment.getMinutes() : moment.getMinutes()}:${moment.getSeconds() < 10 ? "0" + moment.getSeconds() : moment.getSeconds()}`;
  }

  function sendChallenge(user) {
    modalQuestion('Send challenge?', `Do you want to challenge ${user} to a game?`, 'Yes', 'No', () => {
      socket.emit("challenge", {
        intent: "offer",
        target: user
      });
    });
  }

  socket.on('username', (data) => {
    username = data.username;
  })

  socket.on('lobby message', (data) => {
    $('#chat-history').prepend(`<p class="message${data.author === username ? ' own' : ''}"><span class="timestamp">${formatTime(data.timestamp)}</span><span class="author">${data.author}:</span><span class="content">${unescape(data.content)}</span></p>`); 
  });

  socket.on('system message', (data) => {
    $('#chat-history').prepend(`<p class="sys-message"><span class="timestamp">${formatTime(data.timestamp)}</span><span class="content">${data.message}</span></p>`); 
  });

  socket.on('userlist', (data) => {
    const userlistDiv = $('#userlist');
    userlistDiv.text("");
    data.data.forEach((player) => {
      const newEntry = $(`<a class="list-group-item list-group-item-action">${player}</a>`);
      if (player !== username) {
        newEntry.on('click', (e) => {
          sendChallenge(player);
        });
      } else {
        newEntry.addClass('disabled');
      }
      userlistDiv.append(newEntry);
    });
  });

  socket.on('challenge', (data) => {
    switch (data.intent) {
      case "offer":
        modalQuestion('Accept challenge?', `Player ${data.source} is challenging you to a game. Accept?`, 'Yes', 'No', () => {
          data.intent = "accept";
          socket.emit('challenge', data);
        }, () => {
          data.intent = "reject";
          socket.emit('challenge', data);
        });
        break;
      case "reject":
        modalInfo('Challenge rejected', `Player ${data.target} has rejected your challenge.`, 'Ok');
        break;
      case "accepted":
        console.log("New game started with id: " + data.gameId);
        break;
    }
  });

  socket.on('mygames', (data) => {
    const gamesList = $('#games-list');
    gamesList.text('');
    const active = [];
    const finished = [];
    data.data.forEach((entry) => {
      const style = getStyle(entry);
      const label = generateLabel(entry);
      const newEntry = $(`<a class="game-entry list-group-item list-group-item-action${style}">${label}</a>`);
      newEntry.click(function () {
        gamesList.children().removeClass('active');
        $(this).addClass('active');
        showGame(entry.id);
        $('#lobby').css('display', 'none');
        $('#game').css('display', '');
      });
      if (entry.status === -2 || entry.status === -1) {
        active.push(newEntry);
      } else {
        finished.push(newEntry);
      }
    });
    finished.forEach(e => gamesList.prepend(e));
    active.forEach(e => gamesList.prepend(e));
  });

  socket.on('game', (data) => {
    switch (data.action) {
      case 'send':
        const gameId = data.data.meta.id;
        games[gameId] = data.data;
        if (gameIdToDisplay === gameId || (currentGame && currentGame.meta.id === gameId)) {
          showGame(gameId);
          gameIdToDisplay = null;
        }
        break;
      case 'resign':
        if (currentGame && currentGame.meta.id === data.gameId) {
          modalInfo("You win", "Your opponent resigned.", "Ok");
        }
        break;
      case 'draw':
        if (currentGame && currentGame.meta.id === data.gameId) {
          modalInfo("Draw offer", "Your opponent offered a draw.", "Ok");
          games[(data.gameId)].meta.drawOffer = data.player;
          updateGameActions();
        }
        break;
      case 'get messages':
        const messages = data.data;
        gameChats[data.gameId] = messages;
        break;
      case 'send message':
        const id = data.gameId;
        const message = data.message;
        const chat = gameChats[id];
        if (chat && message) {
          chat.push(message);
        }
        if (currentGame && currentGame.meta.id === id) {
          showChat(id);
        }
        break;
    }
  });

  function showGame(gameId) {
    showChat(gameId);
    const game = games[gameId];
    if (game) {
      console.log(game);
      
      currentGame = game;
      selection = null;
      drawBoard();
      updateStatusMessage();
      updateGameActions();
    } else {
      socket.emit('game', { action: "get", gameId: gameId });
      gameIdToDisplay = gameId;
    }
  }

  function showChat(gameId) {
    const messages = gameChats[gameId];
    const history = $('#game-chat-history');
    if (messages) {
      history.html('');
      messages.forEach((elem) => {
        history.prepend(`<p class="message${elem.author === username ? ' own' : ''}"><span class="author">${elem.author}: </span><span class="content">${unescape(elem.message)}</span></p>`);
      });
    } else {
      socket.emit('game', { action: "get messages", gameId: gameId });
    }
  }

  function updateStatusMessage() {
    if (currentGame !== null) {
      const isPlayingBlack = currentGame.meta.blackUser === username;
      let message;
      switch(currentGame.meta.status) {
        case -2:
          if (isPlayingBlack) {
            message = "Opponent's turn";
          } else {
            message = "Your turn";
          }
          break;
        case -1:
          if (isPlayingBlack) {
            message = "Your turn";
          } else {
            message = "Opponent's turn"
          }
          break;
        case 0:
          if (isPlayingBlack) {
            message = "Opponent wins by checkmate";
          } else {
            message = "You win by checkmate";
          }
          break;
        case 1:
          if (isPlayingBlack) {
            message = "You win by checkmate";
          } else {
            message = "Opponent wins by checkmate";
          }
          break;
        case 2:
          if (isPlayingBlack) {
            message = "Opponent wins by resignation";
          } else {
            message = "You win by resignation";
          }
          break;
        case 3:
          if (isPlayingBlack) {
            message = "You win by resignation";
          } else {
            message = "Opponent wins by resignation";
          }
          break;
        case 4:
          message = "Draw by material";
          break;
        case 5:
          message = "Draw by stalemate";
          break;
        case 6: 
          message = "Draw by the fifty moves rule";
          break;
        case 7:
          message = "Draw by agreement";
          break;
      }
      $('#game-message').text(message);
    }
  }

  function updateGameActions() {
    const resign = $('#resign-btn');
    const draw = $('#draw-btn');
    if (currentGame.meta.status !== -1 && currentGame.meta.status !== -2) {
      resign.addClass('disabled');
      draw.addClass('disabled');
    } else {
      const playerColor = currentGame.meta.whiteUser === username ? 0 : 1;
      resign.removeClass('disabled');
      draw.removeClass('disabled');
      resign.click(() => modalQuestion("Are you sure?", "Do you want to resign?", "Yes", "No", () => sendResign()));
      if (currentGame.meta.drawOffer === -1) {
        draw.html('Offer draw');
        draw.click(() => modalQuestion("Are you sure?", "Do you want to offer your opponent a draw?", "Yes", "No", () => sendDraw()));
      } else if (currentGame.meta.drawOffer !== playerColor) {
        draw.html('Accept draw');
        draw.click(() => modalQuestion("Are you sure?", "Do you want to accept your opponent's draw offer?", "Yes", "No", () => sendDraw()));
      } else {
        draw.html('Offer draw');
        draw.addClass('disabled');
      }
    }
  }

  function sendResign() {
    socket.emit("game", {
      gameId: currentGame.meta.id,
      action: "resign"
    });
  }

  function sendDraw() {
    const player = currentGame.meta.whiteUser === username ? 0 : 1;
    socket.emit("game", {
      gameId: currentGame.meta.id,
      action: "draw",
      player: player
    });
    currentGame.meta.drawOffer = player;
    updateGameActions();
  }

  function isItMyTurn() {
    if (currentGame) {
      if (currentGame.meta.status === -2) {
        return currentGame.meta.whiteUser === username;
      } else if (currentGame.meta.status === -1) {
        return currentGame.meta.blackUser === username;
      }
    }
    return false;
  }

  function getStyle(gameEntry) {
    let result = '';
    switch (gameEntry.status) {
      case -2:
        if (gameEntry.whiteUser === username) {
          result = ' my-turn';
        }
        break;
      case -1:
        if (gameEntry.blackUser === username) {
          return ' my-turn';
        }
        break;
      default:
        result = ' game-over';
    }
    return result;
  }

  function generateLabel(gameEntry) {
    let result = gameEntry.whiteUser === username ? 'You vs ' : gameEntry.whiteUser + ' vs ';
    result += gameEntry.blackUser === username ? 'You' : gameEntry.blackUser;
    result += `: ${gameEntry.numMoves / 2} moves played.`;
    return result;
  }

  function modalQuestion(title, text, yesLabel, noLabel, yesCallback, noCallback=undefined) {
    gameModalTitle.text(title);
    gameModalText.text(text);
    gameModalYesBtn.text(yesLabel);
    gameModalYesBtn.css('display', '');
    gameModalYesBtn.off('click');
    gameModalYesBtn.on('click', yesCallback);
    gameModalNoBtn.text(noLabel);
    gameModalNoBtn.off('click');
    if (noCallback) {
      gameModalNoBtn.on('click', noCallback);
    }
    gameModal.modal('show');
  }

  function modalInfo(title, text, btnLabel, btnCallback=undefined) {
    gameModalTitle.text(title);
    gameModalText.text(text);
    gameModalYesBtn.off('click');
    gameModalYesBtn.css('display', 'none');
    gameModalNoBtn.text(btnLabel);
    gameModalNoBtn.off('click');
    if (btnCallback) {
      gameModalNoBtn.click(btnCallback);
    }
    gameModal.modal('show');
  }
});