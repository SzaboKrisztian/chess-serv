const express = require('express');
const Game = require('./chess-game');
const test = require('./test2.json');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const game = new Game(test);

app.use(express.static('public'));

app.get("/game", (req, res) => {
  return res.send(game);
});

app.post("/game", (req, res) => {
  const piecePos = parseInt(req.body.piecePos, 10);
  const move = parseInt(req.body.move, 10);

  if (move !== undefined) {
    try {
      game.makeMove(piecePos, move);
      return res.send(game);
    } catch (error) {
      console.log(error);
      
      return res.status(400).send({ response: error });
    }
  } else {
    return res.status(400).send({ response: "Invalid request." });
  }
});

const port = 3000;

app.listen(port, (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Listening on port", port);
  }
});