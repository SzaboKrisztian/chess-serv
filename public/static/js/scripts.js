$(() => {  
  const loginModal = $('#loginModal');
  const loginMessage = $('#loginMessage');
  const resetModal = $('#resetModal');
  const resetMessage = $('#resetMessage');

  $('#loginNav').click(() => {
    loginModal.css("display", "block");
  });

  $('#loginClose').click(() => {
    loginModal.css("display", "none");
  });

  $('#resetClose').click(() => {
    resetModal.css("display", "none");
  });

  $('#loginSubmit').click(() => {
    const data = {
      username: $('#username').val(),
      password: $('#password').val()
    }

    $.ajax({
      type: 'post',
      url: '/auth/login',
      data: data,
      dataType: "json",
      success: (result, status, xhr) => {
        window.location.href = window.location.origin;
      },
      error: (xhr, status, error) => {
        loginMessage.text(xhr.responseJSON.response);
      }
    });
  });

  $('#logoutNav').click(() => {
    const data = {
      username: $('#username').val(),
      password: $('#password').val()
    }
    console.log(data);
    
    $.ajax({
      type: 'get',
      url: '/auth/logout',
      data: data,
      dataType: "json",
      success: (result, status, xhr) => {
        window.location.href = window.location.origin;
      },
      error: (xhr, status, error) => {
        console.log("Error logging out.");
      }
    });
  });

  $('#resetLink').click(() => {
    loginModal.css("display", "none");
    resetModal.css("display", "block");
  });

  $('#loginLink').click(() => {
    resetModal.css("display", "none");
    loginModal.css("display", "block");
  });

  $('#resetSubmit').click(() => {
    const user = $('#resetUsername').val();
    const mail = $('#resetEmail').val();
    if ((user !== "" && mail !== "") || (user === "" && mail === "")) {
      resetMessage.text("Please only fill in either username or email, but not both.");
    } else {
      let data = { }
      if (user !== "") {
        data.username = user;
      } else {
        data.email = mail;
      }

      $.ajax({
        type: 'post',
        url: '/auth/req_reset',
        data: data,
        dataType: 'json',
        success: (result, status, xhr) => {
          resetMessage.text("An email with reset instructions has been sent to the registered address.");
        },
        error: (xhr, status, error) => {
          resetMessage.text(xhr.responseJSON.response);
        }
      });
    }
  });

  $(window).click((event) => {
    if (event.target == loginModal[0]) {
      loginModal.css("display", "none");
    } else if (event.target == resetModal[0]) {
      resetModal.css("display", "none");
    }
  });
});
