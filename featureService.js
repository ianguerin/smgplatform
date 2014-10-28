'use strict';

angular.module('myApp')
  .service('featureService', function($window, $scope) {
  
  function setflags(){
  
  var args = {};
  
  //Set all feature flags to on (by default) here
  var flags = {'automatch':1,'emailJsErrors':1,'rflag1':1,'rflag2':1};
  
  var platformUrl = $window.location.search;
  var gameUrl = platformUrl.substring(1);
  gameUrl = gameUrl.split('&');
  var len = gameUrl.length;
  for(var i =0;i<len;i++)
  {
		var temp = gameUrl[i].split('=');
		if(temp[0]==='on'){args['on']=temp[1];}
		else if(temp[0]==='off'){args['off']=temp[1];}
		else if(temp[0]==='gameId'){args['gameId']=temp[1];}
  }
  
  //What you want to do with the arguments goes here
  
  var offstring = args.off;
  if(offstring.search('AUTO_MATCH')!== -1){flags.automatch=0;}
  if(offstring.search('EMAIL_JS_ERRORS') !== -1){flags.emailJsErrors=0;}
  console.log(flags);
  }
  
  this.setflags = setflags;
  
  
}); 
