'use strict';

angular.module('myApp', [])
  .controller('Ctrl', function ($scope, serverApiService) {
    serverApiService.sendMessage(
        [{getServerApi:{serverApiResult:"TYPE_DESCRIPTIONS_RESULT"}}],
        function (response) {
          $scope.closureTypes = angular.toJson(response[0].serverApiTypeDescriptions, true);
        });

    if(window.localStorage.getItem("myPlayerId") && window.localStorage.getItem("accessSignature")){
      $scope.loggedIn = true;
      $scope.displayName = window.localStorage.getItem("displayName")
    }else{
      $scope.loggedIn = false;
    }

    $scope.sendMessage = function () {
      var messageObj = eval($scope.json);  
      
      serverApiService.sendMessage(messageObj, function (response) {
        $scope.response = angular.toJson(response, true);
      });
    };

    $scope.checkIdAndSig = function(){
      alert(window.localStorage.getItem("myPlayerId") + " " + window.localStorage.getItem("accessSignature"));
    };

    $scope.registerPlayerAsGuest = function () {
      console.log("register player as guest");
      var displayName = "Guest-" + Math.floor(Math.random()*1000);

      var message = [{registerPlayer:{displayName: displayName, avatarImageUrl: "images/avatar0.png"}}]

      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $scope.loggedIn = true;
        $scope.displayName = displayName;
        window.localStorage.setItem("myPlayerId", eval($scope.response)[0].playerInfo.myPlayerId);
        window.localStorage.setItem("accessSignature", eval($scope.response)[0].playerInfo.accessSignature);
        window.localStorage.setItem("displayName", displayName);
      });
    };
  })
  .factory('$exceptionHandler', function ($window) {
    return function (exception, cause) {
      exception.message += ' (caused by "' + cause + '")';
      $window.alert(exception.message);
      throw exception;
    };
  });
