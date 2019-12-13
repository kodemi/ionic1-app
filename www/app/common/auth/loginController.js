(function() {
    'use strict';
    angular
        .module('common.auth')
        .controller('LoginController', LoginController);

    function LoginController(
        $auth,
        Account,
        $cordovaPinDialog,
        $cordovaToast,
        $ionicPlatform,
        $scope,
        $location,
        $translate,
        $timeout,
        $window,
        utils
    ) {
        var vm = this;
        vm.login = login;
        vm.enterPin = enterPin;
        vm.isWebView = ionic.Platform.isWebView;

        $scope.$on('$ionicView.enter', onEnter);

        ///////////////

        function enterPin() {
            $cordovaPinDialog
                .prompt(
                    $translate.instant('MESSAGES.PIN'),
                    $translate.instant('APP_LOGIN'),
                    [$translate.instant('OK'), $translate.instant('CANCEL')]
                )
                .then(function(result) {
                    if (result.buttonIndex == 2) {
                        enterPin();
                        return;
                    }
                    vm.pincode = result.input1;
                    login();
                })
                .catch(function(error) {
                    console.error(error);
                });
        }

        function login() {
            utils.showLoading();
            if (vm.isWebView()) {
                vm.IMEI = cordova.plugins.uid.IMEI;
            }
            if (!vm.pincode) {
                enterPin();
                return;
            }
            $auth
                .login({ pincode: vm.pincode, IMEI: vm.IMEI })
                .then(function() {
                    utils.hideLoading();
                    Account.getProfile().then(function(profile) {
                        AppCenter.Analytics.trackEvent('User login', {
                            Username: profile && profile['Имя']
                        });
                    });
                    $location.path('/');
                    //alerts.show('AUTH.LOGIN_SUCCESS');
                })
                .catch(function(response) {
                    utils.hideLoading();
                    var msg = response.data
                        ? response.data.code
                        : 'AUTH.LOGIN_ERROR';
                    var options =
                        (response.data && response.data.options) || {};
                    console.error(response);
                    $cordovaToast.showLongBottom(
                        $translate.instant('MESSAGES.LOGIN_ERROR')
                    );
                    if (vm.isWebView()) {
                        enterPin();
                    }
                    //alerts.show(msg, options, 5000);
                });
        }

        function onEnter() {
            $ionicPlatform.ready(function() {
                utils.hideLoading(0);
                navigator.splashscreen && navigator.splashscreen.hide();
                $timeout(enterPin, 0);
                $timeout($window.cordova.plugins.Keyboard.show, 500);
            });
        }
    }
})();
