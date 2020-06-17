const Game = require('../models/Game');
const User = require('../models/User');
const Message = require('../models/Message');
const ChessGame = require('../chess-logic/chess-game');
const userSockets = [];
const cachedGames = [];

module.exports = (io) => {
  io.on('connection', (socket) => {
    if (socket.request.session.user === undefined) {
      socket.disconnect(true);
    } else {
      const username = socket.request.session.user.username;
      socket.emit("username", { username: username });
      const email = socket.request.session.user.email;
      socket.broadcast.emit('system message', { message: `${username} connected.`, timestamp: Date.now() });

      userSockets.push({
        socketId: socket.id,
        username: username,
        email: email
      });

      io.emit('userlist', { data: getUsernames() });
      getMyGames(username).then((result) => socket.emit('mygames', result));

      socket.on('game', async (data) => {
        if (data.gameId) {
          const game = await getGame(data.gameId);
          if (isPlaying(username, game)) {
            const opponent = username === game.meta.whiteUser ? game.meta.blackUser : game.meta.whiteUser;
            const opponentSocket = userSockets.find((s) => s.username === opponent);
            switch(data.action) {
              case "get":
                socket.emit('game', { action: "send", data: game });
                break;
              case "move":
                if (isPlayerMove(username, game) && data.piecePosition && data.move) {
                  try {
                    game.obj.makeMove(data.piecePosition, data.move);
                    game.meta.status = game.obj.state;
                    game.meta.numMoves = game.obj.history.length - 1;
                    game.meta.drawOffer = -1;
                    await saveGame(game);
                    socket.emit('game', { action: "send", data: game });
                    socket.emit('mygames', await getMyGames(username));
                    if (opponentSocket) {
                      io.to(opponentSocket.socketId).emit('game', { action: "send", data: game });
                      io.to(opponentSocket.socketId).emit('mygames', await getMyGames(opponent));
                    }
                  } catch (error) {
                    console.log(error);
                  }
                }
                break;
              case "draw":
                if (game.obj.drawOffer === -1) {
                    game.obj.drawOffer = data.player;
                    game.meta.drawOffer = data.player;
                    await saveGame(game);
                    if (opponentSocket) {
                      io.to(opponentSocket.socketId).emit('game', data);
                    }
                } else {
                  if (data.player !== game.obj.drawOffer) {
                    game.obj.state = 7;
                    game.meta.status = 7;
                    await saveGame(game);
                    socket.emit('game', { action: "send", data: game });
                    socket.emit('mygames', await getMyGames(username));
                    if (opponentSocket) {
                      io.to(opponentSocket.socketId).emit('game', { action: "send", data: game });
                      io.to(opponentSocket.socketId).emit('mygames', await getMyGames(opponent));
                    }
                  }
                }
                break;
              case "resign":
                const newState = username === game.meta.whiteUser ? 3 : 2;
                game.meta.status = newState;
                game.obj.state = newState;
                await saveGame(game);
                socket.emit('game', { action: "send", data: game });
                socket.emit('mygames', await getMyGames(username));
                if (opponentSocket) {
                  io.to(opponentSocket.socketId).emit('game', { action: "send", data: game });
                  io.to(opponentSocket.socketId).emit('mygames', await getMyGames(opponent));
                  io.to(opponentSocket.socketId).emit('game', data);
                }
                break;
              case "get messages":
                socket.emit("game", { gameId: data.gameId, action: "get messages", data: await Message.query().where({ gameId: data.gameId })});
                break;
              case "send message":
                const inserted = await Message.query().insert({
                  gameId: data.gameId,
                  author: username,
                  message: escape(data.message)
                });
                const msg = {
                  ...data,
                  message: (await Message.query().where({ id: inserted.id }))[0]
                }
                socket.emit('game', msg)
                if (opponentSocket) {
                  io.to(opponentSocket.socketId).emit('game', msg);
                }
                break;
            }
          }
        }
      });

      socket.on('challenge', async (data) => {
        let targetSocket, sourceSocket;
        switch(data.intent) {
          case "offer":            
            targetSocket = userSockets.find((s) => s.username === data.target);
            sourceSocket = userSockets.find((s) => s.username === data.source);
            if (targetSocket && targetSocket.username !== sourceSocket) {
              const reply = { ...data, source: username };
              io.to(targetSocket.socketId).emit('challenge', reply);
            } else if (targetSocket == undefined) {
              socket.emit('challenge', {
                ...data,
                intent: "error",
                message: "User not online."
              });
            }
            break;
          case "accept":
            // Avoid relying on the active socket connections in case one of the parties disconnected in the meantime.
            const sourceResult = await User.query().where({ username: data.source });
            const targetResult = await User.query().where({ username: data.target });
            const sourceUser = sourceResult[0];
            const targetUser = targetResult[0];

            // create a new game
            const meta = (Math.random() < 0.5) ?
              {
                whiteEmail: sourceUser.email,
                whiteUser: sourceUser.username,
                blackEmail: targetUser.email,
                blackUser: targetUser.username
              } :
              {
                whiteEmail: targetUser.email,
                whiteUser: targetUser.username,
                blackEmail: sourceUser.email,
                blackUser: sourceUser.username
              }
            const game = new ChessGame();

            const gameData = {
              meta: meta,
              obj: game
            }
            // save it
            const gameId = await saveGame(gameData);
            // emit the confirmation and updated games list to both players
            const msg = {
              intent: "accepted",
              gameId: gameId
            }
            sourceSocket = userSockets.find((s) => s.username === data.source);
            targetSocket = userSockets.find((s) => s.username === data.target);
            
            if (sourceSocket) {
              io.to(sourceSocket.socketId).emit('mygames', await getMyGames(sourceSocket.username));
              io.to(sourceSocket.socketId).emit('challenge', msg);
            }
            if (targetSocket) {
              io.to(targetSocket.socketId).emit('mygames', await getMyGames(targetSocket.username));
              io.to(targetSocket.socketId).emit('challenge', msg);
            }
            break;
          case "reject":
            targetSocket = userSockets.find((s) => s.username === data.source);
            if (targetSocket) {
              io.to(targetSocket.socketId).emit('challenge', data);
            }
            break;
        }
      });

      socket.on('mygames', async (data) => {
        socket.emit('mygames', await getMyGames(username));
      })

      socket.on('lobby message', (data) => {
        const message = { author: socket.request.session.user.username, content: escape(data.content), timestamp: Date.now() }
        
        io.emit('lobby message', message);
      });
    
      socket.once('disconnect', () => {
        socket.broadcast.emit('system message', { message: `${username} disconnected.`, timestamp: Date.now() });
        const user = userSockets.find((s) => s.username === username);
        if (user) {
          userSockets.splice(userSockets.indexOf(user), 1);
        }
        io.emit('userlist', { data: getUsernames() });
      });
    }
  });
}

async function getGame(gameId) {
  let game = cachedGames.find((g) => g.meta.id === gameId);
  if (!game) {
    const gameData = await Game.query().where({ id: gameId });
    if (gameData.length > 0) {
      game = {
        meta: gameData[0],
        obj: new ChessGame(JSON.parse(gameData[0].data))
      }
      delete game.meta.data;
      cachedGames.push(game);
    }
  }
  return game;
}

function getUsernames() {
  return userSockets.map((s) => s.username).sort();
}

async function getMyGames(username) {
  return { data: await Game.query().select('id', 'whiteUser', 'blackUser', 'status', 'numMoves', 'createdAt', 'updatedAt').where({ whiteUser: username }).orWhere({ blackUser: username })};
}

function isPlaying(username, game) {
  if (username && game) {
    return username === game.meta.whiteUser || username === game.meta.blackUser;
  }
  return false;
}

function isPlayerMove(username, game) {
  if (username && game) {
    if (game.meta.status === -2) {
      return game.meta.whiteUser === username;
    } else if (game.meta.status === -1) {
      return game.meta.blackUser === username;
    }
  }
  return false;
}

async function saveGame(gameObj) {
  const meta = gameObj.meta;
  const data = JSON.stringify(gameObj.obj);
  if (!meta.id) {
    const saved = await Game.query().insert({
      white_user: meta.whiteUser,
      white_email: meta.whiteEmail,
      black_user: meta.blackUser,
      black_email: meta.blackEmail,
      data: data,
      status: gameObj.obj.state,
      num_moves: gameObj.obj.history.length - 1,
      draw_offer: gameObj.obj.drawOffer
    });
    return saved.id;
  } else {
    await Game.query().findById(meta.id).patch({
      data: data,
      status: gameObj.obj.state,
      num_moves: gameObj.obj.history.length - 1,
      draw_offer: gameObj.obj.drawOffer
    });
  }
}