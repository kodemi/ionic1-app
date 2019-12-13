(function() {
    'use strict';
    angular.module('common').factory('utils', utils);

    function utils(
        API_URL,
        moment,
        $cordovaAppVersion,
        $cordovaToast,
        $http,
        $filter,
        $ionicLoading,
        $ionicPlatform,
        $ionicPopup,
        $timeout,
        $translate,
        $rootScope
    ) {
        var service = {
            combineDates: combineDates,
            hideLoading: hideLoading,
            showLoading: showLoading,
            getAppVersion: getAppVersion,
            getTime: getTime,
            getDate: getDate
        };

        var amUtc = $filter('amUtc');
        var amDateFormat = $filter('amDateFormat');
        var amLocal = $filter('amLocal');

        return service;

        ///////////////////

        function combineDates(dateDate, timeDate) {
            if (!timeDate) {
                timeDate = moment('1970-01-01T00:00:00');
            }
            return timeDate
                .year(dateDate.year())
                .month(dateDate.month())
                .date(dateDate.date())
                .second(0);
        }

        function getAppVersion() {
            return $ionicPlatform
                .ready()
                .then($cordovaAppVersion.getVersionNumber);
        }

        function getDate(dateString, emptyString, isUtc) {
            if (emptyString === undefined) {
                emptyString = '';
            }
            if (!dateString) {
                return emptyString;
            }
            var asUtc = amUtc(dateString);
            var resultTime = isUtc ? asUtc : amLocal(asUtc);
            return amDateFormat(resultTime, 'DD.MM.YYYY');
        }

        function getTime(timeString, emptyString, isUtc) {
            if (emptyString === undefined) {
                emptyString = '';
            }
            if (!timeString) {
                return emptyString;
            }
            var asUtc = amUtc(timeString);
            var resultTime = isUtc ? asUtc : amLocal(asUtc);
            var localeString = isUtc ? 'UTC' : 'LT';
            return amDateFormat(resultTime, 'DD.MM HH:mm') + ' ' + localeString;
        }

        function hideLoading(timeout) {
            timeout = timeout === 'undefined' ? 2000 : 0;
            $timeout(function() {
                $ionicLoading.hide();
            }, timeout);
        }

        function showLoading() {
            $ionicLoading.show({
                template: $translate.instant('WAIT_MESSAGE'),
                hideOnStateChange: true
            });
        }
    }
})();
