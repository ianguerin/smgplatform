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
      $scope.displayName = window.localStorage.getItem("displayName");
      $scope.myPlayerId = window.localStorage.getItem("myPlayerId");
      $scope.accessSignature = window.localStorage.getItem("accessSignature");
    }else{
      $scope.loggedIn = false;
    }

    $scope.$watch('gameId', function (newValue, oldValue) {
      if($scope.gameId != null){
        $scope.getMyMatches();
      }
    }, true);

    // ask server for a list of all the games in the server's library
    $scope.getGames = function(){
      var message = [{getGames: {}}];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $scope.games = eval($scope.response)[0].games;
      });
    };
    $scope.getGames();

    // this is just to verify local storage is working
    $scope.checkIdAndSig = function(){
      if(!$scope.loggedIn){
        alert("log in first!");
        return;
      }
      alert(window.localStorage.getItem("myPlayerId") + " " + window.localStorage.getItem("accessSignature"));
    };

    // if player has selected a game, find a list of their ongoing matches in that game
    $scope.getMyMatches = function(){
      if($scope.gameId == null){
        alert("select a game first!");
        return;
      }
      var message = [{getPlayerMatches: {gameId: $scope.gameId, getCommunityMatches: false, myPlayerId:$scope.myPlayerId, accessSignature:$scope.accessSignature}}];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        console.log($scope.response);
      });
    };

    // if player has selected a game, create new match
    $scope.reserveAutoMatch = function(){
      if(!$scope.loggedIn){
        alert("log in first!");
        return;
      }
      if($scope.gameId == null){
        alert("select a game first!");
        return;
      }
      // currently just allowing automatches
      var message = [{reserveAutoMatch: {tokens:0, numberOfPlayers:2, gameId: $scope.gameId, myPlayerId:$scope.myPlayerId, accessSignature:$scope.accessSignature}}];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        console.log($scope.response);
      });
    };

    // get a playerId and accessSignature for player
    $scope.registerPlayerAsGuest = function () {
      var displayName = "Guest-" + Math.floor(Math.random()*1000);

      var message = [{registerPlayer:{displayName: displayName, avatarImageUrl: "images/avatar0.png"}}];

      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $scope.loggedIn = true;
        
        window.localStorage.setItem("myPlayerId", eval($scope.response)[0].playerInfo.myPlayerId);
        window.localStorage.setItem("accessSignature", eval($scope.response)[0].playerInfo.accessSignature);
        window.localStorage.setItem("displayName", displayName);
        $scope.displayName = displayName;
        $scope.myPlayerId = window.localStorage.getItem("myPlayerId");
        $scope.accessSignature = window.localStorage.getItem("accessSignature");
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
