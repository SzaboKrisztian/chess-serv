$(() => {
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
  let board = null;
  let selection = null;
  
  function draw() {
    ctx.drawImage(board_bg, 0, 0);
    if (board !== null) {
      board.pieces.forEach((piece) => {
        if ((piece.position & 0x88) === 0) {
          const x = piece.position & 0x07;
          const y = 7 - ((piece.position & 0x70) >> 4);
          const img = getPieceGfx(piece);
          ctx.drawImage(img, 0, 0, img.width, img.height, x * cellSize, y * cellSize, cellSize, cellSize);
        }
      });
      if (selection !== null) {
        selection.moves.forEach((move) => {
          const x = move & 0x07;
          const y = 7 - ((move & 0x70) >> 4);
          ctx.drawImage(move_img, 0, 0, move_img.width, move_img.height, x * cellSize, y * cellSize, cellSize, cellSize);
        });
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

  $.ajax({
    url: "/std",
    dataType: "json",
    success: (res) => {
      board = res;
      console.log(board);
      draw();
    }
  });

  $('#board').click((event) => {
    const rect = canvas.getBoundingClientRect();
    const cellH = rect.height / 8.0;
    const x = Math.floor((event.clientX - rect.left) / cellH);
    const y = 7 - Math.floor((event.clientY - rect.top) / cellH);
    const index = (y << 4) + x;
    selection = board.squares[index];
    draw();
  });
});