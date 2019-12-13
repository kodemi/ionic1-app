(function() {
    'use strict';
    angular.module('jpsApp').controller('GHOController', GHOController);

    function GHOController(
        $cordovaToast,
        CacheFactory,
        flight,
        Flight,
        $ionicActionSheet,
        $ionicListDelegate,
        $ionicPopup,
        $scope,
        $state,
        $translate,
        utils
    ) {
        var vm = this;
        var flightRefreshedEvent;
        vm.flight = flight;
        vm.title = getTitle();
        vm.getDate = utils.getDate;
        vm.canISignAndSend = canISignAndSend;
        vm.save = save;
        vm.sign = sign;
        vm.sendWithoutSign = sendWithoutSign;
        vm.showOperations = showOperations;
        vm.onSignature = onSignature;
        vm.onSignatureClear = onSignatureClear;
        vm.onRate = onRate;
        vm.edit = edit;
        vm.addTransfer = addTransfer;
        vm.removeTransfer = removeTransfer;
        vm.addCrewStorage = addCrewStorage;
        vm.removeCrewStorage = removeCrewStorage;
        vm.sortByDate = sortByDate;
        vm.rateDescriptions = [
            '',
            'Poor',
            'Satisfactory',
            'Good',
            'Efficient',
            'Very Efficient'
        ];
        vm.ghoCache = CacheFactory.get('ghoCache');
        vm.cateringAgents = Flight.cateringAgents.sort(function(a, b) {
            return a.name > b.name;
        });
        vm.meetingRooms = Flight.meetingRooms;
        vm.transfersFilter = transfersFilter;
        vm.sendError = false;

        $scope.$on('$ionicView.enter', onEnter);
        $scope.$on('$ionicView.leave', onLeave);

        /////////////

        function setData() {
            var ghoCache;
            vm.ghoDataFromFlight = flight.getGHODataFromFlight();
            if (flight.GHO) {
                flight.getGHO().then(function(gho) {
                    vm.gho = gho;
                    vm.rateDescription = vm.rateDescriptions[vm.gho['Оценка']];
                });
            } else {
                ghoCache = vm.ghoCache.get(vm.flight['НомерПапкиРейса']);
                vm.sendError = ghoCache && !!ghoCache.sendError;
                vm.gho = (ghoCache && ghoCache.gho) || flight.getEmptyGHO();
                if (vm.ghoDataFromFlight.passengerService.VIPParking) {
                    vm.gho.passengerService.VIPParking =
                        vm.ghoDataFromFlight.passengerService.VIPParking;
                }
                vm.rateDescription = vm.rateDescriptions[vm.gho['Оценка']];
            }
            vm.disabled = !!ghoCache || !!flight['GHO'];
        }

        function onEnter() {
            setData();
            flightRefreshedEvent = $scope.$on('flight:refreshed', function(
                e,
                flight
            ) {
                vm.flight = flight;
                vm.ghoDataFromFlight = flight.getGHODataFromFlight();
            });
        }

        function onLeave() {
            flightRefreshedEvent();
        }

        function transfersFilter(type) {
            return function(transfer) {
                return type === 'crew' ? !transfer.PAX : transfer.PAX;
            };
        }

        function getTitle() {
            return vm.flight['ВС'] + ' | GHO';
        }

        function canISignAndSend() {
            return vm.flight && !vm.flight['ВремяGHO'] && !!vm.flight.departure;
        }

        function sortByDate(data) {
            return (
                data &&
                data.sort(function(a, b) {
                    return a['Дата'] > b['Дата']
                        ? 1
                        : a['Дата'] < b['Дата']
                        ? -1
                        : 0;
                })
            );
        }

        function edit() {
            if (vm.flight['ВремяGHO'] || vm.sendError) {
                var popup = $ionicPopup.confirm({
                    title: $translate.instant('GHO.CHANGE_CONFIRM'),
                    // subTitle: $translate.instant('GHO.NEW_SIGNATURE_NEED'),
                    scope: $scope,
                    cancelText: $translate.instant('CANCEL'),
                    okText: $translate.instant('CHANGE'),
                    okType: 'button-assertive'
                });
                popup.then(function(res) {
                    if (!res) {
                        return;
                    }
                    // vm.gho['ПодписьЭкипажа'] = null;
                    // vm.flight['ВремяGHO'] = null;
                    vm.disabled = false;
                });
            } else {
                vm.disabled = false;
            }
        }

        function remove() {
            var popup = $ionicPopup.confirm({
                title: $translate.instant('GHO.DELETE_CONFIRM'),
                scope: $scope,
                cancelText: $translate.instant('CANCEL'),
                okText: $translate.instant('DELETE'),
                okType: 'button-assertive'
            });
            popup.then(function(res) {
                if (!res) {
                    return;
                }
                utils.showLoading();
                vm.flight
                    .removeGHO()
                    .then(function() {
                        delete vm.flight['GHO'];
                        $state.go('app.flight', { id: vm.flight.id });
                        $cordovaToast.showShortBottom(
                            $translate.instant('MESSAGES.GHO_DELETED')
                        );
                    })
                    .catch(function(data) {
                        utils.hideLoading();
                        $cordovaToast.showShortBottom(
                            $translate.instant('MESSAGES.GHO_DELETION_ERROR')
                        );
                    });
            });
        }

        function save() {
            vm.ghoCache.put(vm.flight['НомерПапкиРейса'], { gho: vm.gho });
            utils.showLoading();
            return flight
                .saveGHO(vm.gho)
                .then(function(flight) {
                    vm.flight['GHO'] = flight['GHO'];
                    vm.disabled = !!flight['GHO'];
                    utils.hideLoading();
                    $cordovaToast.showShortBottom(
                        $translate.instant('MESSAGES.GHO_SAVED')
                    );
                    vm.ghoCache.remove(vm.flight['НомерПапкиРейса']);
                })
                .catch(function(data) {
                    utils.hideLoading();
                    vm.ghoCache.put(vm.flight['НомерПапкиРейса'], {
                        gho: vm.gho,
                        saveError: true
                    });
                    console.error(JSON.stringify(data));
                    $cordovaToast.showShortBottom(
                        $translate.instant('MESSAGES.GHO_SAVING_ERROR')
                    );
                    throw new Error(data);
                });
        }

        function send() {
            vm.disabled = true;
            vm.sendError = false;
            vm.ghoCache.put(vm.flight['НомерПапкиРейса'], {
                gho: vm.gho,
                sendError: false
            });
            utils.showLoading();
            return flight
                .sendGHO(vm.gho)
                .then(function(flight) {
                    vm.flight['ВремяGHO'] = flight['ВремяGHO'];
                    $state.go('app.flight', { id: vm.flight.id });
                    $cordovaToast.showShortBottom(
                        $translate.instant('MESSAGES.GHO_SENT')
                    );
                    vm.ghoCache.remove(vm.flight['НомерПапкиРейса']);
                })
                .catch(function(data) {
                    vm.sendError = true;
                    vm.ghoCache.put(vm.flight['НомерПапкиРейса'], {
                        gho: vm.gho,
                        sendError: true
                    });
                    utils.hideLoading();
                    console.error(JSON.stringify(data));
                    $cordovaToast.showShortBottom(
                        $translate.instant('MESSAGES.GHO_SENDING_ERROR')
                    );
                });
        }

        function sign() {
            var ratePopup = $ionicPopup.show({
                templateUrl: 'app/flights/modals/gho-rating.tpl.html',
                title: 'PLEASE RATE OUR SERVICE',
                scope: $scope,
                buttons: [
                    { text: 'Cancel' },
                    {
                        text: 'Rate',
                        type: 'button-positive',
                        onTap: function(e) {
                            if (!vm.gho['Оценка']) {
                                e.preventDefault();
                            }
                            return true;
                        }
                    }
                ]
            });
            ratePopup.then(function(res) {
                if (!res) {
                    return;
                }
                var popup = $ionicPopup.show({
                    templateUrl: 'app/flights/modals/gho-signature.tpl.html',
                    title:
                        'CREW SIGNATURE FOR GROUND HANDLING ORDER AND AIRPORT FEES AND CHARGES',
                    scope: $scope,
                    buttons: [
                        { text: 'Cancel' },
                        {
                            text: 'Send',
                            type: 'button-positive',
                            onTap: function(e) {
                                if (!vm.gho['ПодписьЭкипажа']) {
                                    e.preventDefault();
                                }
                                return true;
                            }
                        }
                    ]
                });
                popup.then(function(res) {
                    if (!res) {
                        vm.gho['ПодписьЭкипажа'] = null;
                        return;
                    }
                    vm.disabled = true;
                    save()
                        .then(send)
                        .catch(function(error) {
                            vm.ghoCache.put(vm.flight['НомерПапкиРейса'], {
                                gho: vm.gho,
                                sendError: true
                            });
                            vm.sendError = true;
                        });
                });
            });
        }

        function sendWithoutSign() {
            save()
                .then(send)
                .catch(function(error) {
                    vm.ghoCache.put(vm.flight['НомерПапкиРейса'], {
                        gho: vm.gho,
                        sendError: true
                    });
                    vm.sendError = true;
                });
        }

        function onRate() {
            vm.rateDescription = vm.rateDescriptions[vm.gho['Оценка']];
        }

        function onSignature(sig) {
            vm.gho['ПодписьЭкипажа'] = sig;
        }

        function onSignatureClear() {
            vm.gho['ПодписьЭкипажа'] = null;
        }

        function handleGHOOperation(operation) {
            switch (operation) {
                case 'editGHO':
                    edit();
                    break;
                case 'removeGHO':
                    remove();
                    break;
            }
        }

        function showOperations() {
            var buttons = [];
            if (vm.flight['GHO'] || vm.sendError || vm.gho['ПодписьЭкипажа']) {
                buttons.push({
                    text:
                        '<i class="icon ion-edit"></i> ' +
                        $translate.instant('GHO.CHANGE_GHO'),
                    key: 'editGHO'
                });
            }
            // if (vm.flight['GHO']) {
            //     buttons.push({
            //         text:
            //             '<span class="assertive"><i class="icon ion-trash-a"></i> ' +
            //             $translate.instant('GHO.DELETE_GHO') +
            //             '</span>',
            //         key: 'removeGHO'
            //     });
            // }
            $ionicActionSheet.show({
                buttons: buttons,
                cancelText: $translate.instant('CANCEL'),
                titleText: $translate.instant('GHO.GHO_OPERATIONS'),
                buttonClicked: function(index) {
                    var selectedOperation = buttons[index].key;
                    handleGHOOperation(selectedOperation);
                    return true;
                }
            });
        }

        function addTransfer(whom, transfer) {
            vm.gho[whom === 'crew' ? 'crewService' : 'passengerService'][
                transfer === 'apron' ? 'apronTransfer' : 'cityTransfer'
            ].push(
                transfer === 'apron'
                    ? { comment: '' }
                    : { from: '', to: '', comment: '' }
            );
        }

        function removeTransfer(whom, transfer, index) {
            $ionicListDelegate.closeOptionButtons();
            vm.gho[whom === 'crew' ? 'crewService' : 'passengerService'][
                transfer === 'apron' ? 'apronTransfer' : 'cityTransfer'
            ].splice(index, 1);
        }

        function addCrewStorage() {
            if (!vm.gho.crewService.crewStorage) {
                vm.gho.crewService.crewStorage = [];
            }
            vm.gho.crewService.crewStorage.push({ count: 0, days: 0 });
        }

        function removeCrewStorage(index) {
            $ionicListDelegate.closeOptionButtons();
            vm.gho.crewService.crewStorage.splice(index, 1);
        }
    }
})();
