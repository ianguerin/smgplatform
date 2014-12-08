'use strict';

angular.module('myApp', ['ngRoute', 'viewsControllers'])
  .controller('Ctrl', 
    function ($sce, $scope, $log, $window, $timeout, $interval, $rootScope, serverApiService, platformMessageService, featureService, stateService) {

    //DEV MODE?
    $scope.devMode = false;

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
    var dateObj;
    var gotGameReady = false;
    var reloadingMatch = false;
    var reloadMatchId;
    var intervalSeconds = 1;

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
          $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);
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
        $scope.flags.passAndPlay = false;
        $scope.flags.autoMatch = true;
        $scope.flags.playAgainstComputer = false;
        $scope.flags.autoRefresh = true;
        $scope.matchId = matchId;
        $scope.iframeLoaded = false;
        window.location.hash = "#/match/" + matchId;
        $scope.history = $scope.myMatches[matchIndex].history;
        var yourPlayerIndex = $scope.getYourPlayerIndexForMatchIndex(matchIndex);

        if(yourPlayerIndex == -1){
          return;
        }
        $scope.yourPlayerIndex = yourPlayerIndex;
        
        // this is the operation that finally loads the game into the iframe
        if(!gotGameReady){
          // $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);  
          // document.getElementById("game_iframe").src = $scope.gameUrl;
        }else{
          $scope.updateTheBoard();
        }
        
        // this is to refresh the iframe
        
        $timeout(function(){
          $scope.showGame = true;
        },500);
      }
    }, true);

    /*
     * state service things
     */

    //play against computer
    $scope.playAgainstComputer = function() {
      $scope.flags.passAndPlay = false;
      $scope.flags.autoMatch = false;
      $scope.flags.playAgainstComputer = true;
      $scope.flags.autoRefresh = false;
      $scope.playMode = "playAgainstTheComputer";
      stateService.setPlayMode($scope.playMode);
      $scope.matchId = "playComputer";
      $scope.openingMove = false;
      window.location.hash = "#/match/playComputer";
      $timeout(function(){
        $scope.showGame = true;
      },500);
      stateService.startNewMatch();
    }

    //play against friend
    $scope.passAndPlay = function() {
      $scope.flags.passAndPlay = true;
      $scope.flags.autoMatch = false;
      $scope.flags.playAgainstComputer = false;
      $scope.flags.autoRefresh = false;
      $scope.playMode = "passAndPlay";
      stateService.setPlayMode($scope.playMode);
      $scope.matchId = "passAndPlay";
      $scope.openingMove = false;
      window.location.hash = "#/match/passAndPlay";
      $timeout(function(){
        $scope.showGame = true;
      },500);
      stateService.startNewMatch();
    }


    // get a playerId and accessSignature for player
    $scope.registerPlayerAsGuest = function () {
      var displayName = "Guest-" + Math.floor(Math.random()*1000);

      var imgUrl = "http://ianguerin.github.io/smgplatform/images/avatar" + Math.floor(Math.random()*10) + ".gif";

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
      });
    };

    $scope.socialLogin = function (message){
      // alert(JSON.stringify(message));
      serverApiService.sendMessage(message, function (response) {
        // console.log("\n\n\n\n\n");
        // console.log(response);
        // console.log("\n\n\n\n\n");

        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        $scope.loggedIn = true;

        window.localStorage.setItem("playerInfo", angular.toJson(response[0].playerInfo, true));
        $scope.playerInfo = JSON.parse(window.localStorage.getItem("playerInfo"));

        // MUST CALL getGames AGAIN!
        $scope.gameId = featureService.args.gameId;
      });
    };

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
        dateObj = new Date();
        $scope.lastCheckForUpdates = dateObj.getTime();
        $scope.summarizeMyMatches();
        if(reloadingMatch){          
          var matchIndex = $scope.getMatchIndex(reloadMatchId);
          if(matchIndex == -1){
            window.location.hash = "#/";
          }else{
            $scope.matchId = reloadMatchId;  
          }
          reloadingMatch = false;
        }
        if(!angular.equals($scope.myMatches, response[0].matches)){
          if($scope.gameUrl){
            if(gotGameReady){
              $scope.updateTheBoard();
            }
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

      $scope.flags.passAndPlay = false;
      $scope.flags.autoMatch = true;
      $scope.flags.playAgainstComputer = false;

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
          window.location.hash = "#/match/" + $scope.matchId;
        }else{ // you are creating a match
          $scope.openingMove = true;
          $scope.yourPlayerIndex = 0;
          $scope.history = null;
          window.location.hash = "#/match/firstMove";
          $scope.matchId = "firstMove";
        }
        // this is the operation that finally loads the game into the iframe
        if($scope.gameUrl){
          $scope.showGame = false;
          if(gotGameReady){
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
            }else{
              $scope.updateTheBoard();  
            }
            
          }
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
      $scope.callRefreshTimeout(1);
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
        window.location.hash = "#/match/" + $scope.matchId;
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
      $scope.callRefreshTimeout(1);
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

    // alert the developer of an error
    $scope.sendEmailJsError = function(message){
      message = [message];
      serverApiService.sendMessage(message, function (response) {
        $scope.response = angular.toJson(response, true);
        $window.lastResponse = response[0];
        alert("a notification has been sent to the developer alerting them of the error");
      });
    };

    // update the board with new states, called by autorefresh and on loading a match into the iframe
    $scope.updateTheBoard = function(){
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
    };

    /*
    * log in initializations
    */

    if(featureService.args.gameId === undefined || featureService.args.gameId == ""){
      alert("you must include a game id in the url... ianguerin.github.io/smgplatform/smgplatform.html?gameId=5765867027562496");  
    }else if(window.localStorage.getItem("playerInfo")){
      $scope.loggedIn = true;
      $scope.playerInfo = JSON.parse(window.localStorage.getItem("playerInfo"));
      $scope.gameId = featureService.args.gameId;
      document.body.style.display = "block";
      if(window.location.hash.indexOf("match/") != -1){
        var matchId = window.location.hash.substring(window.location.hash.indexOf("match/") + 6);
        reloadingMatch = true;
        
        if(window.location.hash.indexOf("playComputer") != -1){
          $scope.flags.passAndPlay = false;
          $scope.flags.autoMatch = false;
          $scope.flags.playAgainstComputer = true;
          $scope.flags.autoRefresh = false;
          reloadMatchId = "playComputer";
        }else if(window.location.hash.indexOf("passAndPlay") != -1){
          $scope.flags.passAndPlay = true;
          $scope.flags.autoMatch = false;
          $scope.flags.playAgainstComputer = false;
          $scope.flags.autoRefresh = false;
          reloadMatchId = "passAndPlay";
        }else{
          reloadMatchId = matchId;
        }
      }else{
        // window.location.hash = "#/choose-match";
      }
    }else{
      $scope.loggedIn = false;
      // set gameid in the register player as guest call back
      $scope.registerPlayerAsGuest();
      // showing loading gif
      document.body.style.display = "block";
    }

    /*
    * platform interaction
    */

    platformMessageService.addMessageListener(function (message) {
      if(message.gameReady !== undefined){// this executes when the game emits a message that it has been loaded
        gotGameReady = true;
        $scope.gameReadyGame = message.gameReady;
        // if($scope.flags.playAgainstComputer || $scope.flags.passAndPlay){
        var game = message.gameReady;
        game.isMoveOk = function (params) {
          platformMessageService.sendMessage({isMoveOk: params});
          return true;
        };
        game.updateUI = function (params) {
          platformMessageService.sendMessage({updateUI: params});
        };
        stateService.setGame(game);
        if($scope.openingMove || $scope.matchId == undefined){// update ui to get everything ready
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
          $scope.updateTheBoard();
        }
      }else if(message.isMoveOkResult !== undefined) { // this executes when an isMoveOkResult message is sent
        if($scope.flags.playAgainstComputer || $scope.flags.passAndPlay){
          if (message.isMoveOkResult !== true) {
            $window.alert("isMoveOk returned " + message.isMoveOkResult);
          }
        }else{
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
        }
      }else if(message.makeMove !== undefined) {
        if($scope.flags.playAgainstComputer || $scope.flags.passAndPlay){
          stateService.makeMove(message.makeMove);
        }else{
          //send move to server
          if($scope.openingMove){
            $scope.createNewGameOnServer(message.makeMove);
            $scope.openingMove = false;
          }else{
            $scope.sendMoveToServer(message.makeMove);
          }
        }
      }else if(message.emailJavaScriptError !== undefined && $scope.flags.emailJsErrors){
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
      return -1;
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
    };

    $scope.isGameOver = function(){
      for(var i = 0; i < $scope.history.moves[$scope.history.moves.length - 1].length; i++){
        if($scope.history.moves[$scope.history.moves.length - 1][i].endMatch !== undefined){
          return $scope.history.moves[$scope.history.moves.length - 1][i].endMatch.endMatchScores;
        }
      }
      return [];
    };

    $scope.isGameOverFromMove = function(move){
      for(var i = 0; i < move.length; i++){
        if(move[i].endMatch !== undefined){
          return move[i].endMatch.endMatchScores;
        }
      }
      return [];
    };

    $scope.logOut = function(){
      window.localStorage.removeItem("playerInfo");
      window.location.reload();
    };

    $scope.changeActive = function(showGame){
      $scope.callRefreshTimeout(1);
      if(($scope.matchId != undefined || window.location.hash.indexOf("firstMove") != -1 || window.location.hash.indexOf("playComputer") != -1 || window.location.hash.indexOf("passAndPlay") != -1) && showGame){
        $scope.showGame = showGame;
      }else{
        $scope.showGame = false;
      }
      $timeout(function(){
    FB.XFBML.parse();      
        },500);
    
    };    

    // this is the auto refresh that grows exponentially
    $scope.callRefreshTimeout = function(newIntervalSeconds){

      if($scope.flags.autoRefresh){
        if(newIntervalSeconds != -1){
          intervalSeconds = newIntervalSeconds;
        }
        $timeout(function() {
          console.log("checking for updates!");
          if($scope.myMatches !== undefined){
            var message = [ // GET_PLAYER_MATCHES
              {
                getPlayerMatches: {
                  gameId: $scope.gameId, 
                  getCommunityMatches: false,
                  updatedTimestampMillisAtLeast: $scope.lastCheckForUpdates,
                  myPlayerId:$scope.playerInfo.myPlayerId, 
                  accessSignature:$scope.playerInfo.accessSignature
                }
              }
            ];
            serverApiService.sendMessage(message, function (response) {
              $scope.response = angular.toJson(response, true);
              dateObj = new Date();
              $scope.lastCheckForUpdates = dateObj.getTime();
              if(response){
                for(var i = 0; i < response[0].matches.length; i++){
                  for(var j = 0; j < $scope.myMatches.length; j++){
                    if($scope.myMatches[j].matchId == response[0].matches[i].matchId){
                      $scope.myMatches[j] = response[0].matches[i];
                      if(j == $scope.getMatchIndex($scope.matchId)){
                        $scope.history = $scope.myMatches[j].history;
                        $scope.updateTheBoard();
                      }
                    }
                  }
                }
                if(response[0].matches.length > 0){
                  $scope.summarizeMyMatches();  
                }
              }
            });
          }
          intervalSeconds *= 2;
          $scope.callRefreshTimeout(-1);
        }, intervalSeconds * 1000);
      }
    };

    // auto refresh will look for changes in the matches that you are playing and update your game
    if($scope.flags.autoRefresh){
      $scope.callRefreshTimeout(-1);
    }

    /*
     * facebook stuff
     */

     $scope.passAuthToAngular = function(auth){
        // console.log("\n\n\n\n\n\n\n\n\n\n");
        // console.log(JSON.stringify(auth));
        // console.log("\n\n\n\n\n\n\n\n\n\n");
        alert("angular knows you now");
        $scope.fbAccessToken = auth.accessToken;
        if($scope.loggedIn){
          alert("you will be joined");
          var message = [ // SOCIAL_LOGIN - JOIN ACCOUNTS
            {
              socialLogin: {
                myPlayerId:$scope.playerInfo.myPlayerId, 
                accessSignature:$scope.playerInfo.accessSignature,
                accessToken: $scope.fbAccessToken,
                uniqueType: "F"
              }
            }
          ];
        }else{
          alert("you will be added as a new user")
          var message = [ // SOCIAL_LOGIN - MERGE ACCOUNTS
            {
              socialLogin: {
                accessToken: $scope.fbAccessToken,
                uniqueType: "F"
              }
            }
          ];
        }
        $scope.socialLogin(message);
      };

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
})
.config(function ($routeProvider) {
  $routeProvider
    .when('/',
    {
      controller: 'RootController',
      templateUrl: 'views/HomeLoginControllerView.html'
    })
    .when('/choose-match',
    {
      controller: 'ChooseMatchController',
      templateUrl: 'views/SelectMatchControllerView.html'

    })
    .when('/match/:selectedMatchId',
    {
      controller: 'MatchController',
      templateUrl: 'views/PlayControllerView.html'

    })
    .when('/new-match',
    {
      controller: 'NewMatchController',
      templateUrl: 'views/StartNewMatchControllerView.html'

    })
    .otherwise({ redirectTo: '/choose-match'});
});