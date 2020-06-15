$(() => {
  const path = window.location.pathname;
  const token = path.substr(path.lastIndexOf('/') + 1);
  const activateMessage = $('#activate-message');
  
  $.ajax({
    type: "GET",
    url: `/auth/activate/${token}`,
    dataType: "json",
    success: (result, status, xhr) => {
      activateMessage.addClass("alert-success").removeClass("alert-danger");
      activateMessage.text("Account successfully activated. You may now log in.");
    },
    error: (xhr, status, error) => {
      activateMessage.addClass("alert-danger").removeClass("alert-success");
      activateMessage.text(xhr.responseJSON.response);
    }
  });
});