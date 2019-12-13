(function() {
    'use strict';
    angular
        .module('common.auth')
        .constant('permissions', {
            VIEW_FLIGHTS: 0x01,
            VIEW_STATS: 0x02,
            ADMINISTER: 0x80
        })
        .factory('Account', Account);

    function Account(AUTH_URL, $auth, $http, permissions) {
        var service = {
            getProfile: getProfile,
            updateProfile: updateProfile,
            can: can,
            isAdministrator: isAdministrator
        };
        return service;

        //////////////

        function getProfile() {
            return $http
                .get(AUTH_URL + 'auth/me')
                .then(function(response) {
                    return response.data;
                })
                .catch(function() {
                    return null;
                });
        }

        function can(permissions) {
            var _permissions =
                $auth.isAuthenticated() && $auth.getPayload().permissions;
            return _permissions & (permissions === permissions);
        }

        function isAdministrator() {
            return can(permissions.ADMINISTER);
        }

        function updateProfile(profileData) {
            return $http.put(AUTH_URL + 'auth/me', profileData);
        }
    }
})();
