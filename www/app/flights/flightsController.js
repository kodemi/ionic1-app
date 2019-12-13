(function() {
    'use strict';
    angular.module('jpsApp').controller('FlightsController', FlightsController);

    function FlightsController(
        Flight,
        $ionicActionSheet,
        $filter,
        CacheFactory,
        profile,
        $scope,
        $state,
        $ionicFilterBar,
        $ionicHistory,
        $ionicListDelegate,
        $ionicNavBarDelegate,
        $ionicScrollDelegate,
        $ionicPopup,
        $timeout,
        $translate,
        $rootScope,
        utils,
        moment
    ) {
        var vm = this,
            flightsRefreshedEvent,
            filterBarInstance;
        if (!profile) {
            return;
        }
        vm.username = profile.username;
        vm.flights = [];
        vm.flightsCount = null;
        vm.selectFlight = selectFlight;
        vm.flightFilter = {};
        vm.startsWith = startsWith;
        vm.contains = contains;
        vm.doRefresh = doRefresh;
        vm.getState = getState;
        vm.showFilterBar = showFilterBar;
        vm.getTime = getTime;
        vm.showFlightOperations = showFlightOperations;
        vm.showOptions = showOptions;
        vm.showSortOptions = showSortOptions;
        vm.staticCache = CacheFactory.get('staticCache');
        vm.settings = function() {
            return vm.staticCache.get('settings');
        };
        vm.showMode = vm.settings().showMode || 'todayFlights';
        vm.sortBy = vm.staticCache.get('sortBy') || 'sortByTail';
        vm.sortDirection = vm.staticCache.get('sortDirection') || 'asc';
        vm.scrollHandle = $ionicScrollDelegate.$getByHandle('flightsDelegate');
        Object.defineProperty(vm, 'lang', {
            get: function() {
                return $translate.use();
            }
        });
        vm.selectedFlightsDate = moment.utc();

        var amDateFormat = $filter('amDateFormat');
        var amUtc = $filter('amUtc');

        $ionicHistory.nextViewOptions({
            historyRoot: true,
            disableBack: true
        });
        // updateView();

        $scope.$on('$ionicView.enter', onEnter);
        $scope.$on('$ionicView.leave', onLeave);
        $scope.$on('$ionicView.afterEnter', function() {
            $timeout(function() {
                $ionicNavBarDelegate.align('left');
            });
        });

        //////////////

        function doRefresh() {
            updateView().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }

        function getState(flight) {
            if (flight['ВылетПоФакту']) {
                return (
                    'Вылетел ' +
                    amDateFormat(amUtc(flight['ВылетПоФакту']), 'HH:mm') +
                    ' UTC'
                );
            } else if (flight['ПрилетПоФакту']) {
                return (
                    'Прилетел ' +
                    amDateFormat(amUtc(flight['ПрилетПоФакту']), 'HH:mm') +
                    ' UTC'
                );
            } else {
                return '-';
            }
        }

        function getTime(flight, timeType, isDeparture, emptyString) {
            var timeString;
            if (!flight) {
                return emptyString;
            }
            if (timeType === 'План') {
                timeString = isDeparture
                    ? flight['ВылетПоПлану']
                    : flight['ПрилетПоПлану'];
            } else if (timeType === 'Факт') {
                timeString = isDeparture
                    ? flight['ВылетПоФакту']
                    : flight['ПрилетПоФакту'];
            } else {
                timeString = flight[timeType];
            }
            return utils.getTime(timeString, emptyString, true);
        }

        function onEnter() {
            Flight.disableFlightAutoUpdate();
            Flight.enableFlightsAutoUpdate();
            Flight.setCurrentId(null);
            flightsRefreshedEvent = $scope.$on(
                'flights:refreshed',
                onFlightsRefreshed
            );
            updateView();
        }

        function onFlightsRefreshed(e, flights) {
            vm.flights = sortedFlights(flights);
            vm.flightsCount = vm.flights.length;
        }

        function onLeave() {
            Flight.disableFlightsAutoUpdate();
            flightsRefreshedEvent();
            $rootScope.flightsScroll = vm.scrollHandle.getScrollPosition();
        }

        function removeFlightFromList(flight) {
            vm.flights.splice(vm.flights.indexOf(flight), 1);
            vm.flightsCount = vm.flights.length;
        }

        function selectFlight(flightId) {
            Flight.setCurrentId(flightId);
            $state.go('app.flight', { id: flightId });
        }

        function showFilterBar() {
            filterBarInstance = $ionicFilterBar.show({
                items: vm.flights,
                done: function() {
                    var input = document.querySelector(
                        'ion-filter-bar input.filter-bar-search'
                    );
                    if (input) {
                        angular
                            .element(input)
                            .attr('placeholder', $translate.instant('SEARCH'));
                    }
                },
                update: function(filteredItems, filterText) {
                    vm.flightFilter['ВС'] = filterText;
                }
            });
        }

        function showFlightOperations(flight) {
            var buttons = [];
            if (flight['Архивный']) {
                buttons.push({
                    text: $translate.instant('FLIGHT_DETAIL.MOVE_TO_WORK'),
                    key: 'unarchive'
                });
            } else {
                buttons.push({
                    text: $translate.instant('FLIGHT_DETAIL.MOVE_TO_ARCHIVE'),
                    key: 'archive'
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
                    handleFlightOperation(flight, selectedOperation);
                    return true;
                }
            });
        }

        function showOptions() {
            var buttons = [];
            if (vm.showMode !== 'todayFlights') {
                buttons.push({
                    text: $translate.instant('SHOW_TODAY_FLIGHTS'),
                    key: 'todayFlights'
                });
            }
            if (vm.showMode !== 'allFlights') {
                buttons.push({
                    text: $translate.instant('SHOW_ALL_FLIGHTS'),
                    key: 'allFlights'
                });
            }
            buttons.push({
                text: $translate.instant('SHOW_BYDATE_FLIGHTS'),
                key: 'dateFlights'
            });
            $ionicActionSheet.show({
                buttons: buttons,
                cancelText: $translate.instant('CANCEL'),
                titleText: $translate.instant('SETTINGS'),
                buttonClicked: function(index) {
                    var selectedOption = buttons[index].key;
                    handleOptions(selectedOption);
                    return true;
                }
            });
        }

        function handleOptions(option) {
            switch (option) {
                case 'allFlights':
                    var settings = vm.settings();
                    settings.showMode = 'allFlights';
                    vm.showMode = 'allFlights';
                    vm.staticCache.put('settings', settings);
                    updateView();
                    break;
                case 'todayFlights':
                    var settings = vm.settings();
                    settings.showMode = 'todayFlights';
                    vm.showMode = 'todayFlights';
                    vm.staticCache.put('settings', settings);
                    updateView();
                    break;
                case 'dateFlights':
                    var popup = $ionicPopup.confirm({
                        title: $translate.instant('SELECT_FLIGHTS_DATE'),
                        templateUrl:
                            'app/flights/modals/select-flights-date.tpl.html',
                        scope: $scope,
                        cancelText: $translate.instant('CANCEL'),
                        okText: $translate.instant('OK')
                    });
                    popup.then(function(res) {
                        $ionicListDelegate.closeOptionButtons();
                        if (!res) {
                            return;
                        }
                        var settings = vm.settings();
                        settings.showMode = 'dateFlights';
                        vm.flightsDate = vm.selectedFlightsDate;
                        settings.flightsDate = vm.flightsDate
                            .startOf('day')
                            .format('YYYY-MM-DDTHH:mm:ss[Z]');
                        vm.showMode = 'dateFlights';
                        vm.staticCache.put('settings', settings);
                        updateView();
                    });
                    break;
            }
        }

        function showSortOptions() {
            var directionIcon =
                vm.sortDirection === 'asc'
                    ? '<i class="ion-android-arrow-dropdown"></i>&nbsp;'
                    : '<i class="ion-android-arrow-dropup"></i>&nbsp;';
            var buttons = [
                {
                    text:
                        ((vm.sortBy === 'sortByTail' && directionIcon) || '') +
                        $translate.instant('SORT_BY_TAIL'),
                    key: 'sortByTail'
                },
                {
                    text:
                        ((vm.sortBy === 'sortByArrivalTime' && directionIcon) ||
                            '') + $translate.instant('SORT_BY_ARRIVAL_TIME'),
                    key: 'sortByArrivalTime'
                },
                {
                    text:
                        ((vm.sortBy === 'sortByDepartureTime' &&
                            directionIcon) ||
                            '') + $translate.instant('SORT_BY_DEPARTURE_TIME'),
                    key: 'sortByDepartureTime'
                }
            ];
            $ionicActionSheet.show({
                buttons: buttons,
                cancelText: $translate.instant('CANCEL'),
                titleText: $translate.instant('SORT_SETTINGS'),
                buttonClicked: function(index) {
                    var selectedOption = buttons[index].key;
                    handleSortOptions(selectedOption);
                    return true;
                }
            });
        }

        function handleSortOptions(option) {
            vm.sortDirection =
                vm.sortBy === option
                    ? vm.sortDirection === 'asc'
                        ? 'dsc'
                        : 'asc'
                    : 'asc';
            vm.sortBy = option;
            vm.staticCache.put('sortBy', option);
            vm.staticCache.put('sortDirection', vm.sortDirection);
            updateView();
        }

        function sortedFlights(flights) {
            var sortField = getSortField();
            return flights.sort(function(a, b) {
                return sortComparator(a[sortField], b[sortField]);
            });
        }

        function getSortField() {
            switch (vm.sortBy) {
                case 'sortByTail':
                    return 'ВС';
                case 'sortByArrivalTime':
                    return 'ПрилетПоПлану';
                case 'sortByDepartureTime':
                    return 'ВылетПоПлану';
            }
        }

        function sortComparator(a, b) {
            var order;
            if (vm.sortBy === 'sortByTail') {
                order =
                    vm.sortDirection === 'asc'
                        ? a >= b
                            ? 1
                            : -1
                        : a <= b
                        ? 1
                        : -1;
            } else {
                if (!a) {
                    return 1;
                }
                order =
                    vm.sortDirection === 'asc'
                        ? moment(a) >= moment(b)
                            ? 1
                            : -1
                        : moment(a) <= moment(b)
                        ? 1
                        : -1;
            }
            return order;
        }

        function handleFlightOperation(flight, operation) {
            switch (operation) {
                case 'archive':
                    flight.archive();
                    removeFlightFromList(flight);
                    break;
            }
        }

        function contains(actual, expected) {
            if (!actual) {
                return false;
            }
            return (
                actual
                    .toLowerCase()
                    .replace('-', '')
                    .indexOf(expected.toLowerCase().replace('-', '')) !== -1
            );
        }

        function startsWith(actual, expected) {
            if (!actual) {
                return false;
            }
            return (
                actual
                    .toLowerCase()
                    .replace('-', '')
                    .indexOf(expected.toLowerCase()) === 0
            );
        }

        function updateView() {
            var operation;
            switch (vm.showMode) {
                case 'todayFlights':
                    operation = Flight.getToday;
                    break;
                case 'allFlights':
                    operation = Flight.getAll;
                    break;
                case 'dateFlights':
                    operation = Flight.getByDate;
                    break;
                default:
                    operation = Flight.getToday;
            }
            return operation(true).then(function(flights) {
                vm.flights = sortedFlights(flights);
                vm.flightsCount = vm.flights.length;
                var offset = $rootScope.flightsScroll;
                if (offset) {
                    $timeout(function() {
                        vm.scrollHandle.scrollTo(
                            offset.left,
                            offset.top,
                            false
                        );
                    });
                }
            });
        }
    }
})();
