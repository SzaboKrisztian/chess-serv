const Game = require('../models/Game');
const User = require('../models/User');
const ChessGame = require('../chess-logic/chess-game');
const userSockets = [];
const cachedGames = [];

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log("Client connected", socket.request.session.user);
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

      socket.on('game', async (data) => {
        if (data.gameId) {
          const game = await getGame(data.gameId);
          if (isPlaying(email, game)) {
            const opEmail = email === game.meta.whiteEmail ? game.meta.blackEmail : game.meta.whiteEmail;
            const opponentSocket = userSockets.find((s) => { s.email === opEmail });
            switch(data.action) {
              case "get":
                socket.emit('game', { action: "get", data: game });
                break;
              case "move":
                break;
              case "draw_offer":
                break;
              case "draw_accept":
                break;
              case "draw_reject":
                break;
              case "resign":
                break;
              case "message":
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
            console.log(sourceSocket, targetSocket);
            
            if (sourceSocket) {
              io.to(sourceSocket.socketId).emit('mygames', await getMyGames(email));
              io.to(sourceSocket.socketId).emit('challenge', msg);
            }
            if (targetSocket) {
              io.to(targetSocket.socketId).emit('mygames', await getMyGames(email));
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
        socket.emit('mygames', await getMyGames(email));
      })

      socket.on('lobby message', (data) => {
        const message = { author: socket.request.session.user.username, content: escape(data.content), timestamp: Date.now() }
        
        io.emit('lobby message', message);
      });
    
      socket.once('disconnect', () => {
        const username = socket.request.session.user.username;
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
    const gameData = await Game.query().where({ id: gameId }).withGraphFetched('messages');

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

async function getMyGames(userEmail) {
  return { data: await Game.query().select('id', 'whiteUser', 'blackUser', 'status', 'numMoves').where({ whiteEmail: userEmail }).orWhere({ blackEmail: userEmail })};
}

function isPlaying(email, game) {
  if (email && game) {
    return email === game.meta.whiteEmail || email === game.meta.blackEmail;
  }
  return false;
}

async function saveGame(gameObj) {
  const meta = gameObj.meta;
  const data = JSON.stringify(gameObj.obj);
  if (!meta.id) {
    console.log(gameObj);
    
    const saved = await Game.query().insert({
      white_user: meta.whiteUser,
      white_email: meta.whiteEmail,
      black_user: meta.blackUser,
      black_email: meta.blackEmail,
      data: data,
      status: gameObj.obj.state,
      num_moves: gameObj.obj.history.length - 1
    });
    return saved.id;
  } else {
    Game.query().findById(meta.id).patch({
      data: data
    });
  }
}

async function addMessage(message) {

}