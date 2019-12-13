(function() {
    'use strict';
    angular
        .module('common.auth')
        .controller('LogoutController', LogoutController);

    function LogoutController($auth, $location, $scope, Flight) {
        $scope.$on('$ionicView.enter', onEnter);

        //////////////////////

        function onEnter() {
            if (!$auth.isAuthenticated()) {
                console.warn('not authenticated!');
                return;
            }
            $auth
                .logout()
                .then(function() {
                    Flight.disableFlightsAutoUpdate();
                    Flight.disableFlightAutoUpdate();
                    $location.path('/login');
                })
                .catch(function(error) {
                    console.error(error);
                });
        }
    }
})();
