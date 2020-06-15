$(() => {
  $('#show-lobby-btn').click(() => {
    const lobby = $('#lobby');
    const game = $('#game');
    if (lobby.css('display') === 'none') {
      game.css('display', 'none');
      lobby.css('display', '');
    } else {
      lobby.css('display', 'none');
      game.css('display', '');
    }
  });
});