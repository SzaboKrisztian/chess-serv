const router = require('express').Router();

const Game = require('../chess-logic/chess-game');
const test = require('../chess-data/test3.json');

const game = new Game();

router.get("/", (req, res) => {
  return res.sendFile(__dirname + '/../public/draw.html');
});

router.get("/game", (req, res) => {
  return res.send(game);
});

router.get("/test", (req, res) => {
  return res.send(test);
});

router.post("/game", (req, res) => {
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

module.exports = router;