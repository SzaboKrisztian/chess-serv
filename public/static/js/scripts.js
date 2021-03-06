$(() => {
  const loginMessage = $('#login-message');
  const resetMessage = $('#reset-message');

  $('#login-submit').click(() => {
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
        loginMessage.addClass("alert-danger").removeClass("alert-success");
        loginMessage.text(xhr.responseJSON.response);
      }
    });
  });

  $('#logout-nav').click(() => {
    $.ajax({
      type: 'get',
      url: '/auth/logout',
      dataType: "json",
      success: (result, status, xhr) => {
        window.location.href = window.location.origin;
      },
      error: (xhr, status, error) => {
        console.log("Error logging out.");
      }
    });
  });

  $('#reset-link').click(() => {
    $('#login-modal').modal('hide');
  });

  $('#reset-submit').click(() => {
    const user = $('#reset-username').val();
    const mail = $('#reset-email').val();
    if ((user !== "" && mail !== "") || (user === "" && mail === "")) {
      resetMessage.addClass("alert-danger").removeClass("alert-success");
      resetMessage.text("Please only fill in either username or email, but not both.");
    } else {
      const data = {};
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
          resetMessage.addClass("alert-success").removeClass("alert-danger");
          resetMessage.text("An email with reset instructions has been sent to the registered address.");
        },
        error: (xhr, status, error) => {
          resetMessage.addClass("alert-danger").removeClass("alert-success");
          resetMessage.text(xhr.responseJSON.response);
        }
      });
    }
  });
});