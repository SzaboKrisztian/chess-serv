const Game = require('../models/Game');
const User = require('../models/User');
const ChessGame = require('../chess-logic/chess-game');
const usersOnline = [];
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

      usersOnline.push(username);
      userSockets.push({
        socketId: socket.id,
        username: username,
        email: email
      });
      usersOnline.sort();
      io.emit('userlist', { data: usersOnline });

      socket.on('game', async (data) => {
        if (data.gameId) {
          const game = getGame(data.gameId);
          if (isPlaying(email, game)) {
            const opEmail = email === game.meta.whiteEmail ? game.meta.blackEmail : game.meta.whiteEmail;
            const opponent = userSockets.find((s) => { s.email === opEmail });
            switch(data.action) {
              case "get":
                socket.emit('game', game.meta);
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
        let target, source;
        switch(data.intent) {
          case "offer":            
            target = userSockets.find((s) => s.username === data.target);
            source = username;
            if (target && target.username !== source) {
              const reply = { ...data, source: username };
              io.to(target.socketId).emit('challenge', reply);
            } else {
              socket.emit('challenge', {
                ...data,
                intent: "error",
                message: "User not online."
              });
            }
            break;
          case "accept":
            source = userSockets.find((s) => s.username === data.source);
            target = userSockets.find((s) => s.username === data.target);
            // create a new game
            const meta = Math.random() < 0.5 ?
              {
                whiteEmail: source.email,
                whiteUser: source.username,
                blackEmail: target.email,
                blackUser: target.email
              } :
              {
                whiteEmail: target.email,
                whiteUser: target.username,
                blackEmail: source.email,
                blackUser: source.username
              }
            const game = new ChessGame();

            const gameData = {
              meta: meta,
              obj: JSON.stringify(game)
            }
            // save it
            const gameId = await saveGame(gameData);
            // emit the game id to both players
            const msg = {
              intent: "accepted",
              gameId: gameId
            }
            io.to(source.socketId).emit('challenge', msg);
            io.to(target.socketId).emit('challenge', msg);
            break;
          case "reject":
            target = userSockets.find((s) => s.username === data.source);
            if (target) {
              io.to(target.socketId).emit('challenge', data);
            }
            break;
        }
      });

      socket.on('mygames', async (data) => {
        socket.emit('mygames', { data: await getMyGames(email) });
      })

      socket.on('lobby message', (data) => {
        const message = { author: socket.request.session.user.username, content: escape(data.content), timestamp: Date.now() }
        
        io.emit('lobby message', message);
      });
    
      socket.once('disconnect', () => {
        const username = socket.request.session.user.username;
        socket.broadcast.emit('system message', { message: `${username} disconnected.`, timestamp: Date.now() });
        usersOnline.splice(usersOnline.indexOf(username), 1);
        io.emit('userlist', { data: usersOnline });
      });
    }
  });
}

async function getGame(gameId) {
  let game = cachedGames.find((g) => g.meta.id === gameId);
  if (!game) {
    const gameData = await Game.query().where({ id: gameId }).withGraphFetched('messages');
    game = {
      meta: gameData,
      obj: new ChessGame(gameData.data)
    }
    cachedGames.push(game);
  }
  return game;
}

async function getMyGames(userEmail) {
  return await Game.query().select('id', 'whiteUser', 'blackUser').where({ whiteEmail: userEmail }).orWhere({ blackEmail: userEmail });
}

function isPlaying(email, game) {
  if (email && game.meta.whiteEmail && game.meta.blackEmail) {
    return email === game.meta.whiteEmail || email === game.meta.blackEmail
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
      data: data
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