(function() {
    'use strict';
    angular
        .module('jpsApp')
        .controller('FlightItemController', FlightItemController);

    function FlightItemController(
        $cordovaToast,
        Flight,
        flight,
        $ionicActionSheet,
        $ionicListDelegate,
        $ionicPopup,
        $scope,
        $stateParams,
        $state,
        $translate,
        utils
    ) {
        var vm = this,
            flightRefreshedEvent;
        vm.flightId = Number($stateParams.id);
        vm.flight = flight;
        vm.angar = [];
        vm.showFlightOperations = showFlightOperations;
        vm.isWebView = ionic.Platform.isWebView;
        vm.doRefresh = doRefresh;
        vm.getTime = getTime;
        vm.onFlightDetailInfoTap = onFlightDetailInfoTap;
        vm.onOperationTap = onOperationTap;
        vm.isUtc = true;
        vm.operations = {
            departure: Flight.getOperations()['Вылет'],
            arrival: Flight.getOperations()['Прилет']
        };
        vm.setOperation = setOperation;
        vm.unsetOperation = unsetOperation;
        vm.addAngar = addAngar;
        vm.gho = {};
        vm.editingComment = false;
        vm.editComment = editComment;
        vm.saveComment = saveComment;
        Object.defineProperty(vm, 'lang', {
            get: function() {
                return $translate.use();
            }
        });

        utils.hideLoading();

        $scope.$on('$ionicView.enter', onEnter);
        $scope.$on('$ionicView.leave', onLeave);

        ///////////////

        function doRefresh() {
            updateView().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }

        function getTime(timeString, emptyString) {
            return utils.getTime(timeString, emptyString, vm.isUtc);
        }

        function addAngar() {
            vm.angar.push({});
        }

        function handleFlightOperation(operation) {
            switch (operation) {
                case 'createGHO':
                    $state.go('app.GHO', { id: vm.flight.id });
                    break;
                case 'viewGHO':
                    $state.go('app.GHO', { id: vm.flight.id });
                    break;
                case 'archive':
                    vm.flight.archive().then(function() {
                        $cordovaToast.showShortBottom(
                            $translate.instant('MESSAGES.FLIGHT_TO_ARCHIVE')
                        );
                        $state.go('app.flights');
                    });
                    break;
                case 'unarchive':
                    vm.flight.unarchive().then(function() {
                        $cordovaToast.showShortBottom(
                            $translate.instant('MESSAGES.FLIGHT_TO_WORK')
                        );
                        $state.go('app.flights');
                    });
                    break;
            }
        }

        function getGHO() {
            if (vm.flight.GHO) {
                vm.flight.getGHO().then(function(gho) {
                    vm.gho = gho;
                });
            }
        }

        function onEnter() {
            Flight.enableFlightAutoUpdate();
            flightRefreshedEvent = $scope.$on('flight:refreshed', function(
                e,
                flight
            ) {
                vm.flight = flight;
                updateAngar(flight);
                getGHO();
            });
            getGHO();
            updateView();
        }

        function updateAngar(flight) {
            vm.angar = (flight['ИспользованиеАнгара'] || []).concat(
                vm.angar.filter(function(item) {
                    !item.hasOwnProperty('id');
                })
            );
            if (vm.angar.length === 0) {
                vm.angar = [{}];
            }
        }

        function onLeave() {
            //Flight.disableFlightAutoUpdate();
            //flightRefreshedEvent();
        }

        function showFlightOperations() {
            var buttons = [];
            if (!vm.flight['GHO']) {
                buttons.push({
                    text: $translate.instant('FLIGHT_DETAIL.CREATE_GHO'),
                    key: 'createGHO'
                });
            } else {
                buttons.push({
                    text: $translate.instant('FLIGHT_DETAIL.SHOW_GHO'),
                    key: 'viewGHO'
                });
            }

            $ionicActionSheet.show({
                buttons: buttons,
                cancelText: $translate.instant('CANCEL'),
                titleText: $translate.instant(
                    'FLIGHT_DETAIL.FLIGHT_OPERATIONS'
                ),
                buttonClicked: function(index) {
                    var selectedOperation = buttons[index].key;
                    handleFlightOperation(selectedOperation);
                    return true;
                }
            });
        }

        function updateView() {
            return Flight.get(true).then(function(flight) {
                vm.flight = flight;
                updateAngar(flight);
                utils.hideLoading();
                getGHO();
            });
        }

        function onFlightDetailInfoTap() {
            //vm.isUtc = !vm.isUtc;
        }

        function onOperationTap() {
            //vm.isUtc = !vm.isUtc;
        }

        function setOperation(operation, operationType) {
            vm.operationTime = moment.utc();
            vm.operationDate = moment.utc();
            var popup = $ionicPopup.confirm({
                title: $translate.instant('OPERATIONS.' + operation.key),
                templateUrl: 'app/flights/modals/set-operation.tpl.html',
                scope: $scope,
                cancelText: $translate.instant('CANCEL'),
                okText: $translate.instant('OK')
            });
            popup.then(function(res) {
                $ionicListDelegate.closeOptionButtons();
                if (!res) {
                    return;
                }
                utils.showLoading();
                var operationTime = utils.combineDates(
                    vm.operationDate,
                    vm.operationTime
                );
                vm.flight
                    .setOperation(operation, operationTime, operationType)
                    .then(function(flight) {
                        $cordovaToast.showShortBottom(
                            $translate.instant('MESSAGES.OPERATION_TIME_SET')
                        );
                    })
                    .catch(function() {
                        $cordovaToast.showShortBottom(
                            $translate.instant('ERROR')
                        );
                    })
                    .finally(updateView);
            });
        }

        function unsetOperation(operation, operationType) {
            utils.showLoading();
            $ionicListDelegate.closeOptionButtons();
            vm.flight
                .setOperation(operation, null, operationType)
                .then(function() {
                    $cordovaToast.showShortBottom(
                        $translate.instant('MESSAGES.OPERATION_TIME_REMOVE')
                    );
                })
                .finally(updateView);
        }

        function editComment() {
            if (vm.editingComment) {
                return;
            }
            vm.editingComment = true;
            vm.comment = vm.flight['КомментарийGHO'];
        }

        function saveComment() {
            vm.editingComment = false;
            vm.flight.updateComment(vm.comment).finally(updateView);
        }
    }
})();
