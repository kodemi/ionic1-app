(function() {
  'use strict';
  angular.module('jpsApp')
    .controller('MenuController', MenuController);

  function MenuController(Account, Flight, $auth, $cordovaToast, $scope, $location, utils, version) {
    var vm = this;
    vm.logout = logout;
    vm.username = '';
    vm.appVersion = version;

    $scope.$on('$ionicView.enter', onEnter);
    $scope.$on('$stateChangeStart', utils.showLoading);
    $scope.$on('$stateChangeSuccess', utils.hideLoading);

    getProfile();
    
    /////////////////////

    function getAppVersion() {
      utils.getAppVersion().then(function(version) {
        vm.appVersion = version;
      });
    }

    function getProfile() {
      Account.getProfile().then(function(profile) {
        vm.username = profile && profile['Имя'];
      });
    }

    function logout() {
      $location.path('/logout');
    }

    function onEnter() {
      if (!vm.username) {
        getProfile();
      }
    }
  }
}());
