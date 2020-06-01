$(() => {
  const path = window.location.pathname;
  const token = path.substr(path.lastIndexOf('/') + 1);
  const resetMessage = $('#reset-message');
  
  $('#reset-button').click(() => {
    const pass = $('#reset-pass').val();
    const passRep = $('#reset-pass-rep').val();

    if (pass !== "" && pass === passRep) {

      const data = { token: token, password: pass, passwordRepeat: passRep };
      
      $.ajax({
        type: 'post',
        url: '/auth/do_reset',
        data: data,
        dataType: 'json',
        success: (result, status, xhr) => {
          resetMessage.text("Password successfully reset.");
        },
        error: (xhr, status, error) => {
          resetMessage.text(xhr.responseJSON.response);
        }
      });
    } else {
      resetMessage.text("Password and Repeat must both be filled in and match.");
    }
  });


  
});