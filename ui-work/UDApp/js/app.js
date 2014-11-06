var pomidoroApp = angular.module('pomidoroApp',[]);


////////// ROUTING /////////////////////////

// Deffining $routeProvider for Pomidoro applicatiom module
//
pomidoroApp.config(function ($routeProvider) {
	$routeProvider
		
		// We are going to define routes,
		// controllers and templates associated
		// with these routes.
		// You can change these but make sure
		// you know what you are doing
		//

		// main route
		//
		.when('/',
		{
			controller: 'RootController',
			templateUrl: 'views/RootControllerView.html'
		})
		
		// choosing games list page
		//
		.when('/CGV',
		{
			controller: 'ChooseGameController',
			templateUrl: 'views/ChooseGameControllerView.html'

		})

		// game options page
		//
		.when('/GOV',
		{
			controller: 'GameOptionsController',
			templateUrl: 'views/GameOptionsControllerView.html'

		})
        // My friends page
        //
        .when('/MFV',
        {
            controller: 'FriendsListController',
            templateUrl: 'views/FriendsListControllerView.html'

        })

        // ongoing games page
        //
        .when('/OGV',
        {
            controller: 'OngoingMatchesController',
            templateUrl: 'views/OngoingMatchesControllerView.html'

        })

        // Bug Report page
        //
        .when('/BRV',
        {
            controller: 'BugReportController',
            templateUrl: 'views/BugReportControllerView.html'

        })



		// if non of the above routes
		// are matched we are setting router
		// to redirect to the RootController
		.otherwise({ redirectTo: '/'});

});

pomidoroApp.config(function ($httpProvider){
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
});


///////// CONTROLERS ////////////////////////////
// Below we are going to define all the controllers
// we have defined in the router
//

// RootController
//
pomidoroApp.controller('RootController', function($scope){

});



// TheatersController
//
pomidoroApp.controller('ChooseGameController', function($scope,GamesFactory){
	
	// This controller is going to set theaters
	// variable for the $scope object in order for view to
	// display its contents on the screen as html 
	$scope.Games = [];

	// Just a housekeeping.
	// In the init method we are declaring all the
	// neccesarry settings and assignments
	init();

	function init(){
		$scope.Games = GamesFactory.getGames();
	}	
});





pomidoroApp.controller('GameOptionsController', function($scope){


});


pomidoroApp.controller('FriendsListController', function($scope) {


});



    pomidoroApp.controller('OngoingMatchesController', function ($scope) {



    });





    pomidoroApp.factory('GamesFactory', function () {
        var Games = [
            { name: 'Fox And Hounds', Info: 'Made By George'},
            { name: 'Reversi', Info: 'Purnima'},
            { name: 'Yatze ', Info: 'Ian'},
            { name: 'Games of the Amazon ', Info: 'Prakhar'},
            { name: 'Boku ', Info: 'Calvin'}

        ];

        var factory = {};
        factory.getGames = function () {

            // If performing http communication to receive
            // factory data, the best would be to put http
            // communication code here and return the results
            return Games;
        }

        return Games;
    });






