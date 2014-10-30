'use strict';

angular.module('myApp')
  .service('featureService', function($window, $log) {  
  var featureService = this;

  this.args = {};
  this.init = function(){  
    //Set all feature flags to on (by default) here
    featureService.flags = {'automatch':1,'emailJsErrors':1,'rflag1':1,'rflag2':1};
    
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
      featureService.flags.automatch = 0;
    }
    if(featureService.args.off && offstring.search('EMAIL_JS_ERRORS') !== -1){
      featureService.flags.emailJsErrors = 0;
    }
   // console.log(flags);
  };
}); 
