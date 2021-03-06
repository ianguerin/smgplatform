/* facebook things */
  // This is called with the results from from FB.getLoginStatus().
  function statusChangeCallback(response) {
    console.log('statusChangeCallback');
    console.log(response);
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected') {
      // Logged into your app and Facebook.
      console.log(response.authResponse.accessToken);
      console.log(response.authResponse.userID);
      console.log('https://graph.facebook.com/'+ response.authResponse.userID + '/picture?type=square'); // 50x50 pic
      console.log('https://graph.facebook.com/'+ response.authResponse.userID + '/picture?width=100&height=100');
      console.log('You can pass this ServerApi message for creating a new user:');
      console.log('[{socialLogin: {accessToken: "' + response.authResponse.accessToken + '", uniqueType: "F"}}]');
      console.log('Or this message to merge with an existing user by passing myPlayerId+accessSignature:');
      console.log('[{socialLogin: {myPlayerId: "5660460074401792", accessSignature: "dbc116314cb079b3f139f7ea3838bfad", accessToken: "' + response.authResponse.accessToken + '", uniqueType: "F"}}]');
      testAPI();
    } else if (response.status === 'not_authorized') {
      console.log("The person is logged into Facebook, but not your app.");
    } else {
      console.log("The person is not logged into Facebook.");
    }
  }

  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  function checkLoginState() {
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });
  }

  window.fbAsyncInit = function() {
    FB.init({
      appId      : '780918375297002',
      cookie     : true,  // enable cookies to allow the server to access
                          // the session
      xfbml      : true,  // parse social plugins on this page
      version    : 'v2.1' // use version 2.1
    });

    // Now that we've initialized the JavaScript SDK, we call
    // FB.getLoginStatus().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.

    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });

  };

  // Load the SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

  // Here we run a very simple test of the Graph API after login is
  // successful.  See statusChangeCallback() for when this call is made.
  function testAPI() {
    console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
      console.log('Successful login for: ' + response.name, response);
    });
  }