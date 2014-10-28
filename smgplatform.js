'use strict';

angular.module('myApp', [])
  .controller('Ctrl', 
    function ($sce, $scope, $rootScope, $log, $window, serverApiService, platformMessageService, stateService) {

    // initializing some global variables
    $scope.showGame = false;

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
    //$scope.getGames();

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
        // if there is a match that is joinable
        if(eval($scope.response)[0].matches.length > 0 || true){
          $scope.gameUrl = "http://yoav-zibin.github.io/TicTacToe/game.html";
          $scope.showGame = true;
        }
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

    /*
    * copying and pasting from platform.js
    */
    var platformUrl = $window.location.search;
    var gameUrl = platformUrl.length > 1 ? platformUrl.substring(1) : null;
    if (gameUrl === null) {
      $log.error("You must pass the game url like this: ...platform.html?<GAME_URL> , e.g., http://yoav-zibin.github.io/emulator/platform.html?http://yoav-zibin.github.io/TicTacToe/game.html");
      $window.alert("You must pass the game url like this: ...platform.html?<GAME_URL> , e.g., ...platform.html?http://yoav-zibin.github.io/TicTacToe/game.html");
      return;
    }
    $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);
    var gotGameReady = false;

    $scope.startNewMatch = function () {
      stateService.startNewMatch();
    };
    $scope.getStatus = function () {
      if (!gotGameReady) {
        return "Waiting for 'gameReady' message from the game...";
      }
      var matchState = stateService.getMatchState();
      if (matchState.endMatchScores) {
        return "Match ended with scores: " + matchState.endMatchScores;
      }
      return "Match is ongoing! Turn of player index " + matchState.turnIndex;
    };
    $scope.playMode = "passAndPlay";
    stateService.setPlayMode($scope.playMode);
    $scope.$watch('playMode', function() {
      stateService.setPlayMode($scope.playMode);
    });

    platformMessageService.addMessageListener(function (message) {
      if (message.gameReady !== undefined) {
        gotGameReady = true;
        var game = message.gameReady;
        game.isMoveOk = function (params) {
          platformMessageService.sendMessage({isMoveOk: params});
          return true;
        };
        game.updateUI = function (params) {
          platformMessageService.sendMessage({updateUI: params});
        };
        stateService.setGame(game);
      } else if (message.isMoveOkResult !== undefined) {
        if (message.isMoveOkResult !== true) {
          $window.alert("isMoveOk returned " + message.isMoveOkResult);
        }
      } else if (message.makeMove !== undefined) {
        stateService.makeMove(message.makeMove);
      }
    });

    /*
    * end paste from platform.js
    */


  })
  .factory('$exceptionHandler', function ($window) {
    return function (exception, cause) {
      exception.message += ' (caused by "' + cause + '")';
      $window.alert(exception.message);
      throw exception;
    };
  });
