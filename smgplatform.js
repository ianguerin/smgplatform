'use strict';

angular.module('myApp', [])
  .controller('Ctrl', 
    function ($sce, $scope, $log, $window, $timeout, $rootScope, serverApiService, platformMessageService, featureService) {

    // lets get some flags and args
    featureService.init();
    
    console.log(featureService.flags); 
    console.log(featureService.args);  

    // initializing some global variables
    $scope.showGame = false;
    $scope.openingMove = false;
    $scope.playerInfo = null;
    $scope.noMatches = false; // this is used solely to prevent double updating the matchId
    $scope.endScore = [];
    $scope.flags = featureService.flags;

    var gameUrl;

    /*
    * functions that interact with the server
    */

    // if gameId is updated, then fetch my list of matches that correspond to the new gameID
    $scope.$watch("gameId", function (newValue, oldValue) {
      if($scope.gameId != null){
        if(!$scope.loggedIn){
          alert("log in first!");
          return;
        }

        var message = [ // GET_GAMES
          {
            getGames: {
              gameId: $scope.gameId
            }
          }
        ];
        serverApiService.sendMessage(message, function (response) {
          $scope.response = angular.toJson(response, true);
          $window.lastResponse = response[0];
          gameUrl = response[0].games[0].gameUrl;
          $window.gameInfo = response[0].games[0];
          $scope.history = null;
          $scope.showGame = false;
          $scope.matchId = null;
          $scope.yourPlayerIndex = null;
          $scope.getMyMatches();
        });
      }
    }, true);

    $scope.$watch("matchId", function (newValue, oldValue) {
      if(oldValue != null && newValue != null){
        $scope.getMyMatches();
      }
      if(newValue == null || $scope.noMatches){
        if($scope.noMatches){
          // safe to set it back to false
          $scope.noMatches = false;
          // still need to getMyMatches()
          $scope.getMyMatches();
        }
        return;
      }else{
        if(!$scope.loggedIn){
          return;
        }

        $scope.showGame = false;
        var matchId = newValue;
        var matchIndex = $scope.getMatchIndex(matchId);
        if(matchIndex == -1){
          return;
        }
        $scope.matchId = matchId;
        $scope.history = $scope.myMatches[matchIndex].history;
        var yourPlayerIndex = $scope.getYourPlayerIndexForMatchIndex(matchIndex);

        if(yourPlayerIndex == -1){
          return;
        }
        $scope.yourPlayerIndex = yourPlayerIndex;
        
        // this is the operation that finally loads the game into the iframe
        $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);
        // this is to refresh the iframe
        document.getElementById("game_iframe").src = $scope.gameUrl;
        $timeout(function(){
          $scope.showGame = true;
        },500);
      }
    }, true);

    // get a playerId and accessSignature for player
    $scope.registerPlayerAsGuest = function () {
      var displayName = "Guest-" + Math.floor(Math.random()*1000);

      var imgUrl = "images/avatar" + Math.floor(Math.random()*10) + ".gif";

      var message = [ // REGISTER_PLAYER
        {
          registerPlayer: {
            displayName: displayName, 
            avatarImageUrl: imgUrl
          }
        }
      ];

      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        $scope.loggedIn = true;

        window.localStorage.setItem("playerInfo", angular.toJson(response[0].playerInfo, true));
        $scope.playerInfo = JSON.parse(window.localStorage.getItem("playerInfo"));
        if($scope.playerInfo){
          // refreshes the page
          window.location.reload();
        }
        // MUST CALL getGames AGAIN!
        $scope.gameId = featureService.args.gameId;
        document.getElementById("logging-in-loader").style.display = "none";
      });
    };

    // ask server for a list of all the games in the server's library
    $scope.getGames = function(){
      if(!$scope.loggedIn){
        return;
      }
      var message = [ // GET_GAMES
        {
          getGames: {}
        }
      ];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        $scope.games = response[0].games;
      });
    };
    $scope.getGames();

    // if player has selected a game, find a list of their ongoing matches in that game
    $scope.getMyMatches = function(){
      if($scope.gameId == null){
        alert("select a game first!");
        return;
      }
      var message = [ // GET_PLAYER_MATCHES
        {
          getPlayerMatches: {
            gameId: $scope.gameId, 
            getCommunityMatches: false, 
            myPlayerId:$scope.playerInfo.myPlayerId, 
            accessSignature:$scope.playerInfo.accessSignature
          }
        }
      ];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        $scope.myMatches = response[0].matches;
        $scope.summarizeMyMatches();
        if(!angular.equals($scope.myMatches, response[0].matches)){
          if($scope.gameUrl){
            document.getElementById("game_iframe").src = $scope.gameUrl;
          }
        }
      });
    };

    // create a string that summarizes a match
    $scope.summarizeMyMatches = function(){
      if($scope.myMatches == undefined){
        alert("errored, myMatches is not defined");
      }
      for(var i = 0; i < $scope.myMatches.length; i++){
        var summary = {turn:"", opponent:"", full: ""};
        var yourPlayerIndex = $scope.getYourPlayerIndexForMatchIndex(i);
        var whosTurn = $scope.getTurnIndex($scope.myMatches[i].history.moves[$scope.myMatches[i].history.moves.length - 1]);
        if(whosTurn == yourPlayerIndex){
          summary.turn = "Your turn.";
        }else if((1 - yourPlayerIndex) == whosTurn) {
          summary.turn = "Their turn.";
        }else{
          var endScore = $scope.isGameOverFromMove($scope.myMatches[i].history.moves[$scope.myMatches[i].history.moves.length - 1]);
          if(endScore.length != 2){
            alert("errored while summarizing matches");
          }
          if(endScore[yourPlayerIndex] > endScore[1 - yourPlayerIndex]){
            summary.turn = "You won.";  
          }else if(endScore[yourPlayerIndex] < endScore[1 - yourPlayerIndex]){
            summary.turn = "You lost.";
          }else{
            summary.turn = "You tied.";
          }
        }
        if($scope.myMatches[i].playersInfo[1 - yourPlayerIndex]){
          summary.opponent = "Playing: " + $scope.myMatches[i].playersInfo[1 - yourPlayerIndex].displayName;
        }else{
          summary.opponent += "Playing: No Opponent Yet!";
        }
        summary.full = summary.turn + " " + summary.opponent;
        $scope.myMatches[i].summary = summary;
      }
    };

    // if player has selected a game, find a match to join, or create a new match
    $scope.reserveAutoMatch = function(){
      if(!$scope.loggedIn){
        alert("log in first!");
        return;
      }
      if($scope.gameId == null){
        alert("select a game first!");
        return;
      }

      var message = [ // RESERVE_AUTO_MATCH
        {
          reserveAutoMatch: {
            tokens:0, 
            numberOfPlayers:2, 
            gameId: $scope.gameId, 
            myPlayerId:$scope.playerInfo.myPlayerId, 
            accessSignature:$scope.playerInfo.accessSignature
          }
        }
      ];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        // if there is a match that is joinable
        if(response[0].matches.length > 0){
          // setting this boolean to prevent $scope.watch from changing the history
          $scope.noMatches = true;
          $scope.matchId = response[0].matches[0].matchId;
          $scope.history = response[0].matches[0].history;
          $scope.yourPlayerIndex = 1;
        }else{ // you are creating a match
          $scope.openingMove = true;
          $scope.yourPlayerIndex = 0;
          $scope.history = null;
        }
        // this is the operation that finally loads the game into the iframe
        if($scope.gameUrl){
          $scope.showGame = false;
          $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);
          document.getElementById("game_iframe").src = $scope.gameUrl;
        }else{
          $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);  
        }
        
        $timeout(function(){
          $scope.showGame = true;
        }, 500);
      });
    };

    // creates a new game on the server, making you player one
    $scope.createNewGameOnServer = function(move){
      var message = [ // NEW_MATCH
        {
          newMatch: {
            gameId: $scope.gameId, 
            tokens: 0, 
            move: move, 
            startAutoMatch: { 
              numberOfPlayers : 2 
            }, 
            myPlayerId:$scope.playerInfo.myPlayerId, 
            accessSignature:$scope.playerInfo.accessSignature
          }
        }
      ];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        $scope.noMatches = true;
        $scope.matchId = response[0].matches[0].matchId;
        $scope.history = response[0].matches[0].history;

        // this seems like a LOT of work to find turn index
        // I use zero because I know it is the first entry
        var turnIndexAfter = $scope.getTurnIndex($scope.history.moves[0]);
        platformMessageService.sendMessage({ // must check if the move is ok
          isMoveOk: {
            move: move,
            stateAfterMove: $scope.history.stateAfterMoves[0],
            stateBeforeMove: {},
            turnIndexBeforeMove: 0,
            turnIndexAfterMove: turnIndexAfter
          }
        });
      });
    };

    // sends move in a game that already has been created on the server
    $scope.sendMoveToServer = function(move){
      var message = [ // MADE_MOVE
        {
          madeMove: {
            matchId:$scope.matchId, 
            move: move, 
            moveNumber: $scope.history.moves.length, 
            myPlayerId:$scope.playerInfo.myPlayerId, 
            accessSignature:$scope.playerInfo.accessSignature
          }
        }
      ];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        $scope.history = response[0].matches[0].history;
        $scope.getMyMatches();

        var turnIndexBefore = $scope.getTurnIndex($scope.history.moves[$scope.history.moves.length - 2]);
        var turnIndexAfter = $scope.getTurnIndex($scope.history.moves[$scope.history.moves.length - 1]);
        platformMessageService.sendMessage({ // must check if the move is ok
          isMoveOk: {
            move: move,
            stateAfterMove: $scope.history.stateAfterMoves[$scope.history.moves.length - 1],
            stateBeforeMove: $scope.history.stateAfterMoves[$scope.history.moves.length - 2],
            turnIndexBeforeMove: turnIndexBefore,
            turnIndexAfterMove: turnIndexAfter
          }
        });

      });
    };

    $scope.sendEmailJsError = function(message){
      message = [message];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        alert("a notification has been sent to the developer alerting them of the error");
      });
    };

    /*
    * log in initializations
    */
    if(featureService.args.gameId === undefined){
      alert("you must include a game id in the url... ianguerin.github.io/smgplatform/smgplatform.html?gameId=1234");  
    }else if(window.localStorage.getItem("playerInfo")){
      $scope.loggedIn = true;
      $scope.playerInfo = JSON.parse(window.localStorage.getItem("playerInfo"));
      $scope.gameId = featureService.args.gameId;
      document.body.style.display = "block";
    }else{
      $scope.loggedIn = false;
      // set gameid in the register player as guest call back
      $scope.registerPlayerAsGuest();
      // showing loading gif
      document.body.style.display = "block";
      document.getElementById("logging-in-loader").style.display = "block";
    }


    /*
    * platform interaction
    */

    var gotGameReady = false;
    platformMessageService.addMessageListener(function (message) {
      if(message.gameReady !== undefined){// this executes when the game emits a message that it has been loaded
        gotGameReady = true;
        $scope.gameReadyGame = message.gameReady;
        if($scope.openingMove){// update ui to get everything ready
          platformMessageService.sendMessage({
            updateUI : {
              move : [],
              turnIndexBeforeMove : 0,
              turnIndexAfterMove : 0,
              stateBeforeMove : {},
              stateAfterMove : {},
              yourPlayerIndex : $scope.yourPlayerIndex,
              playersInfo : [
                {
                  playerId: $scope.playerInfo.myPlayerId, 
                  displayName: $scope.playerInfo.displayName, 
                  avatarImageUrl: $scope.playerInfo.avatarImageUrl
                }, 
                {
                  playerId : null
                }
              ],
              endMatchScores: null
            }
          });
        }else{ // this executes when you load a game that already has moves on it
          // add last game state to board
          // maybe put this in its own function, as moving back and forth through history as well as auto refresh will use it
          var turnIndexBefore = $scope.getTurnIndex($scope.history.moves[$scope.history.moves.length - 2]);
          var turnIndexAfter = $scope.getTurnIndex($scope.history.moves[$scope.history.moves.length - 1]);
          var endScore = $scope.isGameOver();
          if(endScore.length == 2){
            $scope.endScore = endScore;
          }else{
            $scope.endScore = [];
          }
          var stateBefore;
          // this is the first move on the board
          if($scope.history.moves.length == 1){
            stateBefore = {};
          }else{
            stateBefore = $scope.history.stateAfterMoves[$scope.history.moves.length - 2];
          }
          var stateAfter = $scope.history.stateAfterMoves[$scope.history.moves.length - 1];
          
          platformMessageService.sendMessage({
            isMoveOk: {
              move: $scope.history.moves[$scope.history.moves.length - 1],
              stateAfterMove: stateAfter,
              stateBeforeMove: stateBefore,
              turnIndexBeforeMove: turnIndexBefore,
              turnIndexAfterMove: turnIndexAfter
            }
          });
        }
      }else if(message.isMoveOkResult !== undefined) { // this executes when an isMoveOkResult message is sent
        var stateAfter = $scope.history.stateAfterMoves[$scope.history.stateAfterMoves.length - 1];
        var stateBefore;

        if($scope.history.moves.length > 1){
          stateBefore = $scope.history.stateAfterMoves[$scope.history.stateAfterMoves.length - 2];  
        }else{
          stateBefore = {};
        }
        
        var move = $scope.history.moves[$scope.history.moves.length - 1];
        var turnIndexAfter = $scope.getTurnIndex($scope.history.moves[$scope.history.moves.length - 1]);
        var turnIndexBefore = $scope.getTurnIndex($scope.history.moves[$scope.history.moves.length - 2]);

        // is this necessary?
        var endScore = $scope.isGameOverFromMove(move);
        if(!(endScore.length == 2)){
          endScore = null;
        }

        platformMessageService.sendMessage({// must update the UI after realizing a move is OK
          updateUI : {
            move : move,
            turnIndexBeforeMove : turnIndexBefore,
            turnIndexAfterMove : turnIndexAfter,
            stateBeforeMove : stateBefore,
            stateAfterMove : stateAfter,
            yourPlayerIndex : $scope.yourPlayerIndex,
            playersInfo : [
              {
                playerId: $scope.playerInfo.myPlayerId, 
                displayName: $scope.playerInfo.displayName, 
                avatarImageUrl: $scope.playerInfo.avatarImageUrl
              }, 
              {
                playerId : null
              }
            ],
            endMatchScores: null
          }
        });
      }else if(message.makeMove !== undefined) {
        //send move to server
        if($scope.openingMove){
          $scope.createNewGameOnServer(message.makeMove);
          $scope.openingMove = false;
        }else{
          $scope.sendMoveToServer(message.makeMove);
        }
      }else if(message.emailJavaScriptError !== undefined){
        $scope.sendEmailJsError(message);
      }
    });
    /*
    * helper methods
    */

    $scope.getTurnIndex = function(move){
      // this means it is the first move
      if(move === undefined){
        return 0;
      }
      for(var i = 0; i < move.length; i++){
        if(move[i].setTurn !== undefined){
            return move[i].setTurn.turnIndex;
        }
      }
    };

    $scope.getMatchIndex = function(matchId){
      // lets be sure myMatches is defined
      if(!$scope.myMatches){
        return -1;
      }
      for(var i = 0; i < $scope.myMatches.length; i++){
        if($scope.myMatches[i].matchId == matchId){
          return i;
        }
      }
    };

    $scope.getYourPlayerIndexForMatchIndex = function(matchIndex){
      if(!$scope.myMatches){
        return -1;
      }
      var match = $scope.myMatches[matchIndex];
      for(var i = 0; i < match.playersInfo.length; i++){
        if(match.playersInfo[i].playerId == $scope.playerInfo.myPlayerId){
          return i;
        }
      }
    }

    $scope.isGameOver = function(){
      for(var i = 0; i < $scope.history.moves[$scope.history.moves.length - 1].length; i++){
        if($scope.history.moves[$scope.history.moves.length - 1][i].endMatch !== undefined){
          return $scope.history.moves[$scope.history.moves.length - 1][i].endMatch.endMatchScores;
        }
      }
      return [];
    }

    $scope.isGameOverFromMove = function(move){
      for(var i = 0; i < move.length; i++){
        if(move[i].endMatch !== undefined){
          return move[i].endMatch.endMatchScores;
        }
      }
      return [];
    }

  })
  .factory('$exceptionHandler', function ($window, $log) {
  return function (exception, cause) {
    $log.info("Game had an exception:", exception, cause);
    var exceptionString = angular.toJson({exception: exception, cause: cause, lastResponse: $window.lastResponse}, true);
    var message = //EMAIL_JAVASCRIPT_ERROR
        {
          emailJavaScriptError: 
            {
              gameDeveloperEmail: $window.gameInfo.gameDeveloperEmail,
              emailSubject: "[SMG PLATFORM ERROR] x [" + $window.gameInfo.languageToGameName.en + "] " + $window.location, 
              emailBody: exceptionString
            }
        };
    $window.parent.postMessage(message, "*");
    $window.alert(exceptionString);
  };
});