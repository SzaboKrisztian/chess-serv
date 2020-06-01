$(() => {
  const socket = io('http://localhost:3310/');
  const sendChModal = $('#send-challenge');
  const sendChMsg = $('#send-ch-msg');
  const receiveChModal = $('#receive-challenge');
  const receiveChMsg = $('#receive-ch-msg');
  const infoModal = $('#info-modal');
  const infoMsg = $('#info-msg');
  let username = "";

  $('#send-ch-close').click(() => {
    sendChModal.css("display", "none");
  });

  $('#cancel-send-ch').click(() => {
    sendChModal.css("display", "none");
  });

  $('#receive-ch-close').click(() => {
    receiveChModal.css("display", "none");
  });

  $('#info-close').click(() => {
    infoModal.css("display", "none");
  })

  $('#info-ok-btn').click(() => {
    infoModal.css("display", "none");
  })

  $(window).click((event) => {
    if (event.target == sendChModal[0]) {
      sendChModal.css("display", "none");
    } else if (event.target == receiveChModal[0]) {
      receiveChModal.css("display", "none");
    } else if (event.target == infoModal[0]) {
      infoModal.css("display", "none");
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

  function formatTime(timestamp) {
    const moment = new Date(timestamp);
    return `${moment.getHours() < 10 ? "0" + moment.getHours() : moment.getHours()}:${moment.getMinutes() < 10 ? "0" + moment.getMinutes() : moment.getMinutes()}:${moment.getSeconds() < 10 ? "0" + moment.getSeconds() : moment.getSeconds()}`;
  }

  function addMessage(message) {
    $('#chat-history').append(`<p class="message"><span class="timestamp">${formatTime(message.timestamp)}</span><span class="author">${message.author}</span><span class="content">${unescape(message.content)}</span></p>`); 
  }

  function sendChallenge(user) {
    sendChMsg.text(`Do you want to challenge ${user} to a game?`);
    const yesBtn = $('#confirm-send-ch');
    yesBtn.off('click');
    yesBtn.click(() => {
      socket.emit("challenge", {
        intent: "offer",
        target: user
      });
      sendChModal.css("display", "none");
    });
    sendChModal.css("display", "block");
  }

  socket.on('username', (data) => {
    username = data.username;
  })

  socket.on('lobby message', (data) => {
    addMessage(data);
  });

  socket.on('system message', (data) => {
    $('#chat-history').append(`<p class="sys-message"><span class="timestamp">${formatTime(data.timestamp)}</span><span class="content">${data.message}</span></p>`); 
  });

  socket.on('userlist', (data) => {
    const userlistDiv = $('#userlist');
    userlistDiv.text("");
    data.data.forEach((player) => {
      const newEntry = $(`<p class="userlist-entry">${player}</p>`);
      if (player !== username) {
        newEntry.on('click', (e) => {
          sendChallenge(player);
        });
      }
      userlistDiv.append(newEntry);
    });
  });

  socket.on('challenge', (data) => {
    switch (data.intent) {
      case "offer":
        receiveChMsg.text(`Player ${data.source} is challenging you to a game. Accept?`);
        const yesBtn = $('#confirm-receive-ch');
        const cancelBtn = $('#reject-receive-ch');
        yesBtn.off('click');
        cancelBtn.off('click');
        yesBtn.click(() => {
          data.intent = "accept";
          socket.emit('challenge', data);
          receiveChModal.css("display", "none");
        });
        cancelBtn.click(() => {
          data.intent = "reject";
          socket.emit('challenge', data);
          receiveChModal.css("display", "none");
        })
        receiveChModal.css("display", "block");
        break;
      case "reject":
        infoMsg.text(`Player ${data.target} has rejected your challenge.`);
        infoModal.css("display", "block");
        break;
      case "accepted":
        console.log("New game started with id: " + data.gameId);
        break;
    }
  });
});