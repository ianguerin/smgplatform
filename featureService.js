'use strict';

angular.module('myApp')
  .service('featureService', function($window, $log) {  
  var featureService = this;

  this.args = {};
  this.init = function(){  
    //Set all feature flags to on (by default) here
    featureService.flags = {'autoMatch':true,'emailJsErrors':true,'listMultiplayerMatches':true,'matchMenu':true};
    
    var platformUrl = $window.location.search;
    var gameUrl = platformUrl.substring(1);
    gameUrl = gameUrl.split('&');
    var len = gameUrl.length;
    for(var i =0;i<len;i++)
    {
  		var temp = gameUrl[i].split('=');
      featureService.args[temp[0]] = temp[1];
    }
    
    var offstring = featureService.args.off;
    if(featureService.args.off && offstring.search('AUTO_MATCH')!== -1){
      featureService.flags.autoMatch = false;
    }
    if(featureService.args.off && offstring.search('EMAIL_JS_ERRORS') !== -1){
      featureService.flags.emailJsErrors = false;
    }
    if(featureService.args.off && offstring.search('LIST_MULTIPLAYER_MATCHES') !== -1){
      featureService.flags.listMultiplayerMatches = false;
    }
    if(featureService.args.off && offstring.search('MATCH_MENU') !== -1){
      featureService.flags.matchMenu = false;
    }
  };
}); 
