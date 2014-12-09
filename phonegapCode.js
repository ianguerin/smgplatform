
function sendToken(token, error) {
  sendMessageToPlatform({token: token, error: error});
  registerForPushNotification();
}

function fbLoginSuccess(userData) {
  facebookConnectPlugin.getAccessToken(function(token) {
      sendToken(token, "");
  }, function(error) {
      sendToken("", error);
  });
}

