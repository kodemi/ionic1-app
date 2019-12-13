(function() {
    'use strict';
    angular.module('common').directive('nativedatepicker', nativedatepicker);

    function nativedatepicker(
        angularMomentConfig,
        $cordovaDatePicker,
        moment,
        $parse
    ) {
        return {
            require: '^ngModel',
            restrict: 'A',
            link: function(scope, elm, attrs, ctrl) {
                var dateFormat = attrs.dateFormat;
                var utc = attrs.utc !== undefined;
                var modelGetter = $parse(attrs['ngModel']);
                var modelSetter = modelGetter.assign;

                attrs.$observe('dateFormat', function(newValue) {
                    if (dateFormat === newValue || !ctrl.$modelValue) {
                        return;
                    }
                    dateFormat = newValue;
                    ctrl.$modelValue = moment(ctrl.$setViewValue);
                });

                ctrl.$formatters.unshift(function(modelValue) {
                    if (!dateFormat || !modelValue) {
                        return '';
                    }
                    var momentDate = utc
                        ? moment.utc(new Date(modelValue))
                        : moment(new Date(modelValue));
                    var retVal = momentDate.format(dateFormat);
                    return retVal;
                });

                ctrl.$parsers.unshift(function(viewValue) {
                    var date = moment(viewValue, dateFormat);
                    return date && date.isValid() ? date : '';
                });

                elm.on('click', function() {
                    var mode = attrs.dateMode;
                    var date = utc
                        ? moment(
                              ctrl.$modelValue.format('HH:mm:ss'),
                              'HH:mm:ss'
                          ).toDate()
                        : ctrl.$modelValue.toDate();
                    $cordovaDatePicker
                        .show({
                            mode: mode,
                            date: date,
                            is24Hour: true,
                            androidTheme: 5 //'THEME_DEVICE_DEFAULT_LIGHT'
                        })
                        .then(
                            function(date) {
                                if (mode === 'time') {
                                    date = utc
                                        ? moment.utc(
                                              moment(date).format('HH:mm:ss'),
                                              'HH:mm:ss'
                                          )
                                        : moment(date);
                                    //   modelSetter(scope, moment.utc(date).tz(angularMomentConfig.timezone));
                                    modelSetter(scope, date);
                                } else {
                                    modelSetter(scope, moment(date));
                                }
                            },
                            function() {
                                console.error(arguments);
                            }
                        );
                });
            }
        };
    }
})();
