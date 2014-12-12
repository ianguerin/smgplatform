var viewsControllers = angular.module('viewsControllers', []);

viewsControllers.controller('RootController', ['$scope', function ($scope) {
  $scope.currentView = "root";
  changeActive();
  document.getElementById("home-tab").className = "tab-item active";
}]);

viewsControllers.controller('ChooseMatchController', ['$scope', function($scope) {
  $scope.currentView = "choosematch";
  changeActive();
  document.getElementById("choosematch-tab").className = "tab-item active";
}]);

viewsControllers.controller('MatchController', ['$scope', '$routeParams', function($scope, $routeParams) {
  $scope.currentView = "match";
  $scope.params = $routeParams;
  changeActive();
  document.getElementById("match-tab").className = "tab-item active";
}]);

function changeActive(){
  document.getElementById("choosematch-tab").className = "tab-item";
  document.getElementById("match-tab").className = "tab-item";
  document.getElementById("home-tab").className = "tab-item";
}