(function() {
    'use strict';
    angular.module('jpsApp').controller('ArchiveController', ArchiveController);

    function ArchiveController(Flight, $ionicActionSheet, $scope, $state) {
        var vm = this;
        vm.flights = [];
        vm.selectFlight = selectFlight;
        vm.doRefresh = doRefresh;
        vm.showFlightOperations = showFlightOperations;

        $scope.$on('$ionicView.enter', doRefresh);

        //updateView();
        Flight.setCurrentId(null);

        //////////////

        function doRefresh() {
            updateView().finally(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }

        function removeFlightFromList(flight) {
            vm.flights.splice(vm.flights.indexOf(flight), 1);
            vm.flightsCount = vm.flights.length;
        }

        function selectFlight(flightId) {
            Flight.setCurrentId(flightId);
            $state.go('app.flight', { id: flightId });
        }

        function updateView() {
            return Flight.getArchived(true).then(function(flights) {
                vm.flights = flights;
            });
        }

        function showFlightOperations(flight) {
            var buttons = [];
            if (flight['Архивный']) {
                buttons.push({ text: 'В работу', key: 'unarchive' });
            } else {
                buttons.push({ text: 'В архив', key: 'archive' });
            }

            var hideSheet = $ionicActionSheet.show({
                buttons: buttons,
                cancelText: 'Отмена',
                titleText: 'Операции над рейсом',
                buttonClicked: function(index) {
                    var selectedOperation = buttons[index].key;
                    handleFlightOperation(flight, selectedOperation);
                    return true;
                }
            });
        }
        function handleFlightOperation(flight, operation) {
            var popup;
            switch (operation) {
                case 'unarchive':
                    flight.unarchive();
                    removeFlightFromList(flight);
                    break;
            }
        }
    }
})();
