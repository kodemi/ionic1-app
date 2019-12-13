(function(){ 'use strict';
    angular.module('common.modals', ['ionic'])
      .factory('Modals', Modals);

    function Modals($ionicModal, $q, $rootScope) {
        var service = {
            init: init,
            show: show
        };

        return service;

        ///////////

        function init(tpl, scope) {
            var promise;
            scope = scope || $rootScope.$new();

            promise = $ionicModal.fromTemplateUrl(tpl, {
                scope: scope
            }).then(function(modal) {
                scope.modal = modal;
                return modal;
            });
            scope.$on('$destroy', function() {
                scope.modal.remove();
            });
            return promise;
        }

        function show(tpl, scope) {
            var deffered = $q.defer();
            init(tpl, scope).then(function(modal) {
                modal.show();
                var hiddenListener = scope.$on('modal.hidden', function() {
                    hiddenListener();
                    if (scope.modalResult !== undefined) {
                        var modalResult = scope.modalResult;
                        delete scope.modalResult;
                        deffered.resolve(modalResult);
                    } else {
                        deffered.reject();
                    }
                })
            });
            return deffered.promise;
        }
    }
}());