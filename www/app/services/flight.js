(function() {
    'use strict';
    angular.module('dataservice').factory('Flight', Flight);

    var FLIGHT_URGENT_PERIOD = 23;

    function Flight(
        API_URL,
        $auth,
        CacheFactory,
        moment,
        $http,
        $q,
        $rootScope
    ) {
        var currentFlight,
            currentFlights,
            Flight,
            flightCache,
            flightsCache,
            staticCache;

        if (!CacheFactory.get('flightCache')) {
            CacheFactory.createCache('flightCache', {
                deleteOnExpire: 'aggressive',
                maxAge: 30000,
                storageMode: 'localStorage'
            });
        }
        flightCache = CacheFactory.get('flightCache');

        if (!CacheFactory.get('flightsCache')) {
            CacheFactory.createCache('flightsCache', {
                deleteOnExpire: 'aggressive',
                maxAge: 30000,
                storageMode: 'localStorage'
            });
        }
        flightsCache = CacheFactory.get('flightsCache');

        if (!CacheFactory.get('staticCache')) {
            CacheFactory.createCache('staticCache', {
                deleteOnExpire: 'aggressive',
                storageMode: 'localStorage'
            });
        }
        staticCache = CacheFactory.get('staticCache');

        Flight = function(data) {
            angular.extend(this, data);
            this.id = this._id;
        };
        Flight.get = getFlight;
        Flight.getAll = getFlights;
        Flight.getToday = getTodayFlights;
        Flight.getByDate = getFlightsByDate;
        Flight.getArchived = getArchived;
        Flight.getCurrentId = getCurrentId;
        Flight.setCurrentId = setCurrentId;
        Flight.disableFlightsAutoUpdate = disableFlightsAutoUpdate;
        Flight.disableFlightAutoUpdate = disableFlightAutoUpdate;
        Flight.enableFlightsAutoUpdate = enableFlightsAutoUpdate;
        Flight.enableFlightAutoUpdate = enableFlightAutoUpdate;
        Flight.getOperations = getOperations;
        Flight.prototype.getEmptyGHO = getEmptyGHO;
        Flight.prototype.getGHODataFromFlight = getGHODataFromFlight;
        Flight.prototype.saveGHO = saveGHO;
        Flight.prototype.sendGHO = sendGHO;
        Flight.prototype.getGHO = getGHO;
        Flight.prototype.removeGHO = removeGHO;
        Flight.prototype.archive = archive;
        Flight.prototype.unarchive = unarchive;
        Flight.prototype.setOperation = setOperation;
        Flight.prototype.updateComment = updateComment;

        Flight.cateringAgents = [
            { id: '48822', name: 'Джет Сервис' },
            { id: '48615', name: 'Джет Сет' },
            { id: '47231', name: 'ДжетПит' },
            { id: '45406', name: 'Гинза Скай' },
            { id: '42941', name: 'Aeromar' },
            { id: '45459', name: 'Россия' },
            { id: '45405', name: 'Флай Сервис' },
            { id: '45800', name: 'Europe Hotel LLC' },
            { id: '46221', name: 'Гинзаскай' },
            { id: '45782', name: 'Kubaro' },
            { id: '49971', name: 'Скай Сервис' }
        ];

        Flight.meetingRooms = [
            { id: 1, name: 'Санкт-Петербург' },
            { id: 2, name: 'За границей' },
            { id: 3, name: 'Россия' }
        ];

        return Flight;

        //////////////

        function getGHODataFromFlight() {
            var flight = this;
            var result = {
                other: {},
                passengerService: {}
            };
            result.passengerService.passengerServiceP3 = {
                arrival: {
                    adults: getPaxCount(flight.arrival, 'ADT'), // 0
                    children: getPaxCount(flight.arrival, 'CHD'), // 0
                    infants: getPaxCount(flight.arrival, 'INF'),
                    transit: getPaxCount(flight.arrival, 'TRA')
                },
                departure: {
                    adults: getPaxCount(flight.departure, 'ADT'),
                    children: getPaxCount(flight.departure, 'CHD'), // 0
                    infants: getPaxCount(flight.departure, 'INF'),
                    transit: getPaxCount(flight.departure, 'TRA')
                }
            };
            result.passengerService.passengerServiceP12 = {
                arrival: {
                    adults: flight.arrival.ASADT || 0,
                    children: flight.arrival.ASCHD || 0,
                    infants: flight.arrival.ASINF || 0,
                    transit: flight.arrival.ASTRA || 0
                },
                departure: {
                    adults: flight.departure.ASADT || 0,
                    children: flight.departure.ASCHD || 0,
                    infants: flight.departure.ASINF || 0,
                    transit: flight.departure.ASTRA || 0
                }
            };
            result.passengerService.apronTransfer = {
                arrival: {
                    pax: flight.arrival.AprTrP,
                    luggage: flight.arrival.AprTrL,
                    representative: flight.arrival.AprTrR,
                    total: flight.arrival.AprTr
                },
                departure: {
                    pax: flight.departure.AprTrP,
                    luggage: flight.departure.AprTrL,
                    representative: flight.departure.AprTrR,
                    total: flight.departure.AprTr
                }
            };
            result.passengerService.luggageHandling = {
                arrival: +flight.arrival.LgHan,
                departure: +flight.departure.LgHan
            };
            result.passengerService.storage = {
                arrival: {
                    count: +flight.arrival.PxStorQty,
                    days: +flight.arrival.PxStorDays
                },
                departure: {
                    count: +flight.departure.PxStorQty,
                    days: +flight.departure.PxStorDays
                }
            };
            if (
                (flight.departure['ПС'] &&
                    flight.departure['ПС'] === 'OPERATOR') ||
                (flight.arrival['ПС'] && flight.arrival['ПС'] === 'OPERATOR')
            ) {
                result.passengerService.VIPParking = {
                    arrival:
                        flight.arrival['ПС'] &&
                        flight.arrival['ПС'] === 'OPERATOR'
                            ? 1
                            : 0,
                    departure:
                        flight.departure['ПС'] &&
                        flight.departure['ПС'] === 'OPERATOR'
                            ? 1
                            : 0
                };
            }
            result.other.newspapers = {
                arrival: +flight.arrival.News,
                departure: +flight.departure.News
            };
            result.other.foreignNewspapers = {
                arrival: +flight.arrival.NewsF,
                departure: +flight.departure.NewsF
            };
            result.other.magazines = {
                arrival: +flight.arrival.NewsM,
                departure: +flight.departure.NewsM
            };
            result.other.personalSinglePass = {
                arrival: +flight.arrival.SnglPass,
                departure: +flight.departure.SnglPass
            };
            result.other.peopleEscorting = {
                arrival: +flight.arrival.PplEsc,
                departure: +flight.departure.PplEsc
            };
            result.other.weapon = {
                arrival: +flight.arrival.WpDel,
                departure: +flight.departure.WpDel
            };
            result.other.meetingRoom = {
                arrival: {
                    room: flight.arrival.MRname,
                    hours: +flight.arrival.MRQty
                },
                departure: {
                    room: flight.departure.MRname,
                    hours: +flight.departure.MRQty
                }
            };

            result.urgentRequest =
                flight['ВремяСтоянки'] / 3600 < FLIGHT_URGENT_PERIOD;
            result.slotCoordination = !!flight['ЗапросыСлотов'];
            result.slotCorrection =
                (flight['ЗапросыСлотов'] &&
                    flight['ЗапросыСлотов'].length - 1) ||
                0;
            if (
                flight.departure['НачалоРуления'] &&
                flight.arrival['Заруливание']
            ) {
                var angarTime = 0;
                for (var item of flight['ИспользованиеАнгара'] || []) {
                    if (item['ВремяУстановки'] && item['ВремяВыкатки']) {
                        angarTime += moment(item['ВремяВыкатки'])
                            .seconds(0)
                            .diff(
                                moment(item['ВремяУстановки']).seconds(0),
                                'hours',
                                true
                            );
                    } else {
                        angarTime = 0;
                        break;
                    }
                }
                angarTime = Math.ceil(angarTime);
                var longTermParking =
                    Math.ceil(
                        moment(flight.departure['НачалоРуления'])
                            .seconds(0)
                            .diff(
                                moment(flight.arrival['Заруливание']).seconds(
                                    0
                                ),
                                'hours',
                                true
                            )
                    ) -
                    angarTime -
                    3;
                result.longTermParking =
                    longTermParking > 0 ? longTermParking : 0;
            }
            return result;
        }

        function archive() {
            var flight = this;
            return updateFlight(flight, {
                Архивный: true,
                ВремяАрхивирования: moment().toISOString()
            });
        }

        function unarchive() {
            var flight = this;
            return updateFlight(flight, {
                Архивный: false,
                ВремяАрхивирования: null
            });
        }

        function disableFlightsAutoUpdate() {
            console.log('Disabling flights auto data refresh');
            flightsCache.setOnExpire(null);
        }

        function disableFlightAutoUpdate() {
            console.log('Disabling flight auto data refresh');
            flightCache.setOnExpire(null);
        }

        function enableFlightAutoUpdate() {
            console.log(
                'Enabling ' +
                    Flight.getCurrentId() +
                    ' flight auto data refresh'
            );
            flightCache.setOnExpire(function(key, value) {
                getFlight(true).then(
                    function(flight) {
                        $rootScope.$broadcast('flight:refreshed', flight);
                        console.log(
                            'Flight Cache for ' +
                                flight['ВС'] +
                                ' was automatically refreshed',
                            new Date()
                        );
                    },
                    function() {
                        console.log(
                            'Error getting data. Putting expired item back to cache',
                            new Date()
                        );
                        flightCache.put(key, value);
                    }
                );
            });
        }

        function enableFlightsAutoUpdate() {
            console.log('Enabling flights auto data refresh');
            flightsCache.setOnExpire(function(key, value) {
                var showMode = staticCache.get('settings').showMode;
                var operation;
                switch (showMode) {
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
                operation(true).then(
                    function(flights) {
                        $rootScope.$broadcast('flights:refreshed', flights);
                        console.log(
                            'Flights Cache was automatically refreshed',
                            new Date()
                        );
                    },
                    function() {
                        console.log(
                            'Error getting data. Putting expired item back to cache',
                            new Date()
                        );
                        flightsCache.put(key, value);
                    }
                );
            });
        }

        function updateFlight(flight, data, operationType) {
            var newData = { НомерПапкиРейса: flight['НомерПапкиРейса'] };

            if (operationType === 'arrival' || operationType === 'departure') {
                newData[operationType] = data;
            } else {
                for (var attrname in data) {
                    newData[attrname] = data[attrname];
                }
            }
            return $http
                .put(API_URL + 'flights/' + flight.id, newData)
                .then(function(response) {
                    // angular.extend(
                    //     flight[isDeparture ? 'departure' : 'arrival'],
                    //     data
                    // );
                    return flight;
                });
        }

        function saveGHO(data) {
            var flight = this;
            if (
                data.crewService.crewLounge &&
                (!data.crewService.crewLounge.count ||
                    !data.crewService.crewLounge.hours)
            ) {
                data.crewService.crewLounge = null;
            }
            if (
                data.crewService.luggageHandling &&
                !data.crewService.luggageHandling.arrival &&
                !data.crewService.luggageHandling.departure
            ) {
                data.crewService.luggageHandling = null;
            }
            if (
                data.crewService.fastTrackCrew &&
                !data.crewService.fastTrackCrew.arrival &&
                !data.crewService.fastTrackCrew.departure
            ) {
                data.crewService.fastTrackCrew = null;
            }
            if (
                data.services.fuelArrangements &&
                !data.services.fuelArrangements.value &&
                !data.services.fuelArrangements.comment
            ) {
                data.services.fuelArrangements = null;
            } else if (data.services.fuelArrangements) {
                data.services.fuelArrangements = {
                    value: data.services.fuelArrangements.value || false,
                    comment: data.services.fuelArrangements.comment || ''
                };
            }
            // if (data.passengerService.passengerServiceP12) {
            //     var ps = data.passengerService.passengerServiceP12;
            //     ps.arrival = ps.arrival || {};
            //     ps.arrival = {
            //         adults: ps.arrival.adults || 0,
            //         children: ps.arrival.children || 0,
            //         infants: ps.arrival.infants || 0
            //     };
            //     ps.departure = ps.departure || {};
            //     ps.departure = {
            //         adults: ps.departure.adults || 0,
            //         children: ps.departure.children || 0,
            //         infants: ps.departure.infants || 0
            //     };
            //     if (
            //         ps.arrival.adults +
            //             ps.arrival.children +
            //             ps.arrival.infants +
            //             ps.departure.adults +
            //             ps.departure.children +
            //             ps.departure.infants ===
            //         0
            //     ) {
            //         data.passengerService.passengerServiceP12 = null;
            //     }
            // }
            if (
                data.passengerService.VIPParking &&
                !data.passengerService.VIPParking.arrival &&
                !data.passengerService.VIPParking.departure
            ) {
                data.passengerService.VIPParking = null;
            }
            delete data.passengerService.passengerServiceP3;
            delete data.passengerService.passengerServiceP12;
            delete data.passengerService.apronTransfer;
            delete data.passengerService.luggageHandling;
            delete data.other.peopleEscorting;
            delete data.other.personalSinglePass;
            delete data.other.weapon;
            delete data.other.magazines;
            delete data.other.foreignNewspapers;
            delete data.other.newspapers;
            delete data.other.meetingRoom;
            return $http
                .post(API_URL + 'flights/' + flight.id + '/gho', data)
                .then(function(response) {
                    flight['GHO'] = response.data['GHO'];
                    return flight;
                });
        }

        function sendGHO(data) {
            var flight = this;
            return $http
                .post(API_URL + 'flights/' + flight.id + '/gho/sends')
                .then(function(response) {
                    flight['ВремяGHO'] = response.data['ВремяGHO'];
                    return flight;
                });
        }

        function getGHO() {
            var flight = this;
            return $http
                .get(API_URL + 'flights/' + flight.id + '/gho')
                .then(function(response) {
                    return response.data;
                });
        }

        function getFlights(fetch) {
            if (fetch) {
                return queryFlights(fetch);
            } else {
                return currentFlights;
            }
        }

        function getTodayFlights(fetch) {
            if (fetch) {
                return queryTodayFlights(fetch);
            } else {
                return currentFlights;
            }
        }

        function getFlightsByDate(fetch) {
            if (fetch) {
                return queryFlightsByDate(fetch);
            } else {
                return currentFlights;
            }
        }

        function getFlight(fetch) {
            if (fetch) {
                return queryFlight(fetch);
            } else {
                return currentFlight;
            }
        }

        function getCurrentId() {
            return staticCache.get('currentFlightId');
        }

        function getArchived() {
            var flights;
            return $http
                .get(
                    API_URL +
                        'supervisors/' +
                        $auth.getPayload().sub +
                        '/archive/'
                )
                .then(function(response) {
                    flights = [];
                    angular.forEach(response.data.flights, function(flight) {
                        flights.push(new Flight(flight));
                    });
                    return flights;
                });
        }

        function queryFlights(fetch) {
            return queryFlights_(fetch, 'all');
        }

        function queryTodayFlights(fetch) {
            return queryFlights_(fetch, 'today');
        }

        function queryFlightsByDate(fetch) {
            var date = staticCache.get('settings').flightsDate;
            return queryFlights_(fetch, 'byDate', date);
        }

        function queryFlights_(fetch, mode, parameters) {
            var deffered = $q.defer(),
                cacheKey = 'flights',
                flights = flightsCache.get(cacheKey);
            if (flights && !fetch) {
                deffered.resolve(flights);
            } else {
                var queryString =
                    mode === 'all'
                        ? ''
                        : mode === 'today'
                        ? '?today'
                        : mode === 'byDate'
                        ? '?date=' + parameters
                        : '';
                $http
                    .get(
                        API_URL +
                            'supervisors/' +
                            $auth.getPayload().sub +
                            '/flights/' +
                            queryString,
                        { warningAfter: 5000 }
                    )
                    .then(
                        function(response) {
                            flights = [];
                            angular.forEach(response.data.flights, function(
                                flight
                            ) {
                                flights.push(new Flight(flight));
                            });
                            flightsCache.put(cacheKey, flights);
                            currentFlights = flights;
                            deffered.resolve(flights);
                        },
                        function(data) {
                            deffered.reject(data);
                        }
                    );
            }
            return deffered.promise;
        }

        function queryFlight(fetch) {
            var deffered = $q.defer(),
                currentFlightId = Flight.getCurrentId(),
                cacheKey = 'flight-' + currentFlightId,
                flight = flightCache.get(cacheKey);
            if (flight && !fetch) {
                deffered.resolve(flight);
            } else {
                $http
                    .get(API_URL + 'flights/' + currentFlightId, {
                        warningAfter: 5000
                    })
                    .then(
                        function(response) {
                            flight = new Flight(response.data);
                            flightCache.put(cacheKey, flight);
                            currentFlight = flight;
                            deffered.resolve(flight);
                        },
                        function(data) {
                            deffered.reject(data);
                        }
                    );
            }
            return deffered.promise;
        }

        function removeGHO() {
            var flight = this;
            return $http
                .delete(API_URL + 'flights/' + flight.id + '/gho')
                .then(function(response) {
                    return response.data;
                });
        }

        function returnToWork() {
            var flight = this;
            return updateFlight(flight, { archived: false, archiveTime: null });
        }

        function setCurrentId(id) {
            if (id === null) {
                staticCache.remove('currentFlightId');
            } else {
                staticCache.put('currentFlightId', id);
            }
        }

        function getOperations() {
            return {
                Вылет: [
                    {
                        name: 'ЭкипажВрем',
                        title: 'Прибытие экипажа',
                        key: 'CREW_ARRIVING'
                    },
                    {
                        name: 'ОкончаниеЗаправкиТопливом',
                        title: 'Окончание заправки топливом',
                        key: 'FUELING_END'
                    },
                    { name: 'Готовность', title: 'Готовность', key: 'READY' },
                    {
                        name: 'ПосадкаПасс',
                        title: 'Прибытие пассажиров на борт',
                        key: 'PAX_ON_BOARD'
                    },
                    {
                        name: 'НачалоРуления',
                        title: 'Начало руления',
                        key: 'TAXIING_START'
                    },
                    {
                        name: 'ВылетПоФакту',
                        title: 'Фактический вылет',
                        key: 'ACTUAL_DEPARTURE'
                    }
                ],
                Прилет: [
                    {
                        name: 'ПрилетПоФакту',
                        title: 'Фактический прилет',
                        key: 'ACTUAL_ARRIVAL'
                    },
                    {
                        name: 'ЭкипажВрем',
                        title: 'Убытие экипажа в гостиницу',
                        key: 'CREW_TO_HOTEL'
                    },
                    {
                        name: 'Заруливание',
                        title: 'Заруливание на МС',
                        key: 'TAXIING_TO_PARKING'
                    }
                ]
            };
        }

        function setOperation(operation, value, operationType) {
            var flight = this;
            var data = {};
            if (
                operation.name === 'ВремяУстановки' ||
                operation.name === 'ВремяВыкатки'
            ) {
                if (
                    flight['ИспользованиеАнгара'] &&
                    flight['ИспользованиеАнгара'].length
                ) {
                    if (operation.id !== 0 && !operation.id) {
                        var newItem = {};
                        newItem[operation.name] = value;
                        data['ИспользованиеАнгара'] = flight[
                            'ИспользованиеАнгара'
                        ].concat([newItem]);
                    } else {
                        data['ИспользованиеАнгара'] = flight[
                            'ИспользованиеАнгара'
                        ].map(function(item) {
                            if (item.id != operation.id) {
                                return item;
                            } else {
                                item[operation.name] = value;
                                return item;
                            }
                        });
                    }
                    data['ИспользованиеАнгара'] = data[
                        'ИспользованиеАнгара'
                    ].map(function(item) {
                        item['ВремяУстановки'] =
                            item['ВремяУстановки'] &&
                            moment.utc(item['ВремяУстановки']);
                        item['ВремяВыкатки'] =
                            item['ВремяВыкатки'] &&
                            moment.utc(item['ВремяВыкатки']);
                        return item;
                    });
                } else {
                    var newItem = {};
                    newItem[operation.name] = value;
                    data['ИспользованиеАнгара'] = [newItem];
                }
            } else {
                data[operation.name] = value;
            }
            return updateFlight(flight, data, operationType);
        }

        function updateComment(data) {
            var flight = this;
            return updateFlight(flight, {
                КомментарийGHO: data
            });
        }

        function getPaxCount(data, field) {
            if (!data) {
                return 0;
            }
            var count =
                Number(data['I3' + field]) || Number(data['R3' + field]);
            return count || 0;
        }

        function getEmptyGHO() {
            return {
                services: {
                    urgentRequest: false,
                    handlingArrangements: false,
                    longTermParking: null, // 0,
                    slotCoordination: false,
                    slotCorrection: null, // 0
                    documentationPrintOut: null, // 0
                    weatherInfo: false,
                    fuelArrangements: null // {value: false, comment: ''}
                },
                passengerService: {
                    // passengerServiceP12: null,
                    VIPParking: null,
                    sportTeamService: null, // {arrival: null, // 0 departure: 0}
                    cityTransfer: []
                },
                crewService: {
                    crewLounge: null, // {count: null, // 0 hours: 0}
                    crewStorage: [],
                    apronTransfer: [],
                    cityTransfer: [],
                    fastTrackCrew: null, // {arrival: null, // 0 departure: 0}
                    luggageHandling: null,
                    visaServices: null, // 0
                    urgentVisaArrangement: false,
                    photoForVisa: false
                },
                catering: {
                    cateringArrangement: null,
                    cateringDelivery: null, // 0
                    customsClearance: null // 0
                },
                other: {
                    hotelReservation: null,
                    carRentalForGuarding: null, // 0
                    personalGuard: null // 0
                },
                additionalRemarks: '',
                captain: '',
                Оценка: 4
            };
        }
    }
})();
