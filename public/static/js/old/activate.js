$(() => {
  const activateMessage = $('#activate-message');

  $('#activate-button').click(() => {
    const token = $('#token').val();
    
    $.ajax({
      type: "GET",
      url: `/auth/activate/${token}`,
      dataType: "json",
      success: (result, status, xhr) => {
        activateMessage.text("Account successfully activated. You may now log in.");
      },
      error: (xhr, status, error) => {
        activateMessage.text(xhr.responseJSON.response);
      }
    })
  });
});