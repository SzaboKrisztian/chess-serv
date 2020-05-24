const express = require('express');
const Board = require('./board_state');
const std = require('./standard_chess.json');
const test = require('./test.json');
const app = express();

brd = new Board(test);

app.use(express.static('public'));

app.get("/std", (req, res) => {
  return res.send(brd);
});

const port = 3000;

app.listen(port, (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Listening on port", port);
  }
});