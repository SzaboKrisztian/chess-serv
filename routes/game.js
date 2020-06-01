const router = require('express').Router();
const { PerformanceObserver, performance } = require('perf_hooks');
const path = require('path');

const Game = require('../chess-logic/chess-game');
const test = require('../chess-data/test3.json');

const game = new Game();

router.get("/cheat", (req, res) => {
  return res.sendFile(path.resolve('public/chat2.html'));
});

router.get("/draw", (req, res) => {
  return res.sendFile(path.resolve('public/draw.html'));
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
      const start = performance.now();
      game.makeMove(piecePos, move);
      const end = performance.now();
      console.log(end - start);
      
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