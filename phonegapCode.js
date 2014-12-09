function sendMessageToPlatform(message) {
  // alert("sendMessageToPlatform:" + JSON.stringify(message));
  window.document.getElementById("platform_iframe").contentWindow.postMessage(
    message, "*");
}
function sendToken(token, error) {
  sendMessageToPlatform({token: token, error: error});
}

function fbLoginSuccess(userData) {
  facebookConnectPlugin.getAccessToken(function(token) {
      sendToken(token, "");
  }, function(error) {
      sendToken("", error);
  });
}

