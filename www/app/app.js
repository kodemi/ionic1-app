(function() {
    'use strict';
    angular
        .module('jpsApp', [
            'config',
            'angular-cache',
            'angularMoment',
            'common',
            'dataservice',
            'ionic',
            'ngCordova',
            'ngCookies',
            'satellizer',
            'ionic-modal-select',
            'jett.ionic.filter.bar',
            'ionic.rating',
            'pascalprecht.translate'
        ])
        .run(function($window, $ionicPlatform) {
            $ionicPlatform.ready(function() {
                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                if ($window.cordova && $window.cordova.plugins.Keyboard) {
                    $window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(
                        true
                    );
                    $window.cordova.plugins.Keyboard.disableScroll(true);
                }
                if ($window.StatusBar) {
                    StatusBar.styleDefault();
                }
            });
        })
        .run(function(CacheFactory) {
            if (!CacheFactory.get('staticCache')) {
                CacheFactory.createCache('staticCache', {
                    deleteOnExpire: 'aggressive',
                    storageMode: 'localStorage'
                });
            }
            if (!CacheFactory.get('ghoCache')) {
                CacheFactory.createCache('ghoCache', {
                    deleteOnExpire: 'aggressive',
                    storageMode: 'localStorage'
                });
            }
            var staticCache = CacheFactory.get('staticCache');
            staticCache.put('settings', {
                showTodayFlights: true
            });
        })
        .run(function($cordovaToast) {
            function dummy() {}
            if (!ionic.Platform.isWebView()) {
                _.forOwn($cordovaToast, function(num, key) {
                    $cordovaToast[key] = dummy;
                });
            }
        })
        .run(function(
            $ionicPopup,
            $ionicPlatform,
            $timeout,
            $translate,
            CHECK_UPDATE_INTERVAL
        ) {
            $ionicPlatform.ready(sync);

            function sync() {
                codePush.sync(syncStatus, {
                    installMode: InstallMode.ON_NEXT_RESUME,
                    minimumBackgroundDuration: 60 * 5
                });
                $timeout(sync, CHECK_UPDATE_INTERVAL);
            }

            function syncStatus(status) {
                switch (status) {
                    case SyncStatus.UPDATE_INSTALLED:
                        $ionicPopup.show({
                            title: $translate.instant(
                                'UPDATE.UPDATE_AVAILABLE'
                            ),
                            subTitle: $translate.instant(
                                'UPDATE.UPDATE_DOWNLOADED'
                            ),
                            buttons: [
                                { text: $translate.instant('UPDATE.CANCEL') },
                                {
                                    text: $translate.instant('UPDATE.RESTART'),
                                    onTap: function(e) {
                                        codePush.restartApplication();
                                    }
                                }
                            ]
                        });
                        break;
                }
            }
        })
        .constant('angularMomentConfig', {
            timezone: 'Europe/Moscow'
        })
        .config(function($ionicConfigProvider) {
            $ionicConfigProvider.scrolling.jsScrolling(true);
        })
        .config(function($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('login', {
                    url: '/login',
                    templateUrl: 'app/common/auth/login.tpl.html',
                    controller: 'LoginController as vm'
                })
                .state('logout', {
                    url: '/logout',
                    template: '<ion-view></ion-view>',
                    controller: 'LogoutController as vm'
                })
                .state('app.profile', {
                    url: '/profile',
                    views: {
                        mainContent: {
                            templateUrl: 'app/common/auth/profile.tpl.html',
                            controller: 'ProfileController as vm'
                        }
                    }
                })
                .state('app', {
                    abstract: true,
                    url: '/app',
                    templateUrl: 'app/layout/menu-layout.tpl.html',
                    controller: 'MenuController as vm',
                    cache: false
                })
                .state('app.flights', {
                    url: '/flights',
                    views: {
                        mainContent: {
                            templateUrl: 'app/flights/flights.tpl.html',
                            controller: 'FlightsController as vm',
                            resolve: {
                                profile: function(Account) {
                                    return Account.getProfile();
                                },
                                authenticated: function(
                                    $location,
                                    $auth,
                                    profile
                                ) {
                                    if (!profile) {
                                        console.log(
                                            'Ошибка получения профиля пользователя. Разлогиниваемся.'
                                        );
                                        $auth.logout();
                                    }
                                    if (!$auth.isAuthenticated()) {
                                        console.log(
                                            'Пользователь не авторизован. Перенаправляем на страницу авторизации.'
                                        );
                                        return $location.path('/login');
                                    }
                                }
                            }
                        }
                    }
                })
                .state('app.flight', {
                    url: '/flights/:id',
                    views: {
                        mainContent: {
                            templateUrl:
                                'app/flights/flightItem/index.tpl.html',
                            controller: 'FlightItemController as vm',
                            resolve: {
                                flight: function(Flight, $stateParams) {
                                    Flight.setCurrentId($stateParams.id);
                                    return Flight.get(true);
                                },
                                authenticated: function($location, $auth) {
                                    if (!$auth.isAuthenticated()) {
                                        return $location.path('/login');
                                    }
                                }
                            }
                        }
                    }
                })
                .state('app.archived-flights', {
                    url: '/archive',
                    views: {
                        mainContent: {
                            templateUrl: 'app/flights/archive.tpl.html',
                            controller: 'ArchiveController as vm'
                        }
                    }
                })
                .state('app.archived-flight', {
                    url: '/archive/:id',
                    views: {
                        mainContent: {
                            templateUrl: 'app/flights/flightItem/index.tpl.html'
                        }
                    }
                })
                .state('app.GHO', {
                    url: '/flights/:id/gho',
                    views: {
                        mainContent: {
                            templateUrl: 'app/flights/gho/index.tpl.html',
                            controller: 'GHOController as vm',
                            resolve: {
                                flight: function(Flight, $stateParams) {
                                    Flight.setCurrentId($stateParams.id);
                                    return Flight.get(true);
                                },
                                authenticated: function($location, $auth) {
                                    if (!$auth.isAuthenticated()) {
                                        return $location.path('/login');
                                    }
                                }
                            }
                        }
                    }
                });

            $urlRouterProvider.otherwise('/app/flights');
        })
        .config(function($translateProvider) {
            $translateProvider
                .useStaticFilesLoader({
                    prefix: './app/i18n/locale-',
                    suffix: '.json'
                })
                .useLocalStorage()
                .registerAvailableLanguageKeys(['en', 'ru'], {
                    en_US: 'en',
                    en_UK: 'en',
                    ru_RU: 'ru'
                })
                .fallbackLanguage('ru')
                .useSanitizeValueStrategy(null);
        })
        .run(function($ionicPlatform, $translate, $cordovaGlobalization) {
            $ionicPlatform.ready(function() {
                var storage = $translate.storage();
                if (!storage.get('lang')) {
                    $cordovaGlobalization.getPreferredLanguage().then(
                        function(language) {
                            $translate.use(language.value.split('-')[0]).then(
                                function() {
                                    storage.put('lang', language.value);
                                },
                                function(error) {
                                    console.error(error);
                                }
                            );
                        },
                        function(error) {
                            console.error(error);
                        }
                    );
                }
            });
        })
        .run(function($rootScope, $ionicHistory, $state) {
            $rootScope.goBack = function() {
                if (
                    !$ionicHistory.backView() ||
                    $state.current.name === 'app.flight'
                ) {
                    $state.go('app.flights');
                } else {
                    $ionicHistory.goBack();
                }
            };

            $rootScope.showCustomBack = false;

            $rootScope.$on('$stateChangeSuccess', function(
                event,
                toState,
                toParams,
                fromState
            ) {
                if (fromState.name === 'app.GHO') {
                    $ionicHistory.removeBackView();
                }
                $rootScope.showCustomBack =
                    toState.name === 'app.flight' || toState.name === 'app.GHO';
            });
        })
        .config(function($authProvider, AUTH_URL) {
            $authProvider.loginUrl = AUTH_URL + 'auth/login';
        })
        .factory('timeoutHttpInterceptor', function($q, $cordovaToast) {
            return {
                request: function(config) {
                    config.timeout = 20000;
                    return config;
                },
                responseError: function(response) {
                    if (response.status === -1) {
                        $cordovaToast.showLongBottom(
                            'Ошибка. Превышено время ожидания ответа'
                        );
                        response.handled = true;
                    }
                    return $q.reject(response);
                }
            };
        })
        .config(function($httpProvider) {
            $httpProvider.interceptors.push('timeoutHttpInterceptor');
        });
})();
