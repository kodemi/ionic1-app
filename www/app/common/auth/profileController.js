(function(){ 'use strict';
    angular.module('common.auth')
      .controller('ProfileController', ProfileController);

    function ProfileController(Account, $ionicPopup, $scope, $translate) {
        var vm = this;
        vm.getProfile = getProfile;
        vm.changeSignature = changeSignature;
        vm.onSignature = onSignature;
        vm.onSignatureClear = onSignatureClear;
        vm.changeLang = changeLang;
        vm.user = {};
        vm.lang = $translate.use();

        vm.getProfile();

        ///////////////
        
        function changeLang() {
            $translate.use(vm.lang);    
        }

        function changeSignature() {
            var popup = $ionicPopup.show({
                templateUrl: 'app/common/auth/account-signature.tpl.html',
                title: $translate.instant("CHANGE_SIGNATURE_DIALOG"),
                scope: $scope,
                buttons: [
                    { text: $translate.instant("CANCEL")},
                    {
                        text: $translate.instant("SAVE"),
                        type: 'button-positive',
                        onTap: function(e) {
                            if (!vm.signature) {
                                e.preventDefault();
                            }
                            return true;
                        }
                    }
                ]
            });
            popup.then(function(res) {
                if (!res) {
                    vm.signature = null;
                    return;
                }
                vm.user['Подпись'] = vm.signature;
                Account.updateProfile(vm.user);
            })
        }

        function getProfile() {
            Account.getProfile()
              .then(function(data) {
                  vm.user = data;
              }, function(error) {
                  var msg = error.code || 'AUTH.LOGIN_ERROR';
                  var options = error.options || {};
                  //alerts.show(msg, options, 5000);
              });
        }

        function onSignature(sig) {
            vm.signature = sig;
        }

        function onSignatureClear() {
            vm.signature = null;
        }
    }
}());