$(() => {
  const message = $('#reg-message');
  const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/

  $('#reg-button').click(() => {
    const email = $('#reg-email').val();
    const username = $('#reg-user').val();
    const password = $('#reg-pass').val();
    const passwordRepeat = $('#reg-pass-rep').val();

    if (email !== "" && username !== "" && password !== "" && passwordRepeat !== "") {
      if (emailPattern.test(email)) {
        if (password === passwordRepeat && password.length >= 8) {
          const data = {
            username: username,
            email: email,
            password: password,
            passwordRepeat: passwordRepeat
          }
      
          $.ajax({
            type: 'post',
            url: '/auth/signup',
            data: data,
            dataType: "json",
            success: (result, status, xhr) => {
              message.addClass("alert-success").removeClass("alert-danger");
              message.text("Account created. Check your email for further instructions.");
              setTimeout(() => {
                window.location.href = window.location.origin;
              }, 2000);
            },
            error: (xhr, status, error) => {
              message.text(xhr.responseJSON.response);
            }
          });
        } else {
          message.addClass("alert-danger").removeClass("alert-success");
          message.text("Passwords must match and be at least 8 characters long.");
        }
      } else {
        message.addClass("alert-danger").removeClass("alert-success");
        message.text("Invalid email address.");
      }
    } else {
      message.addClass("alert-danger").removeClass("alert-success");
      message.text("You must fill in all the fields.");
    }
  });
});