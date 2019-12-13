angular.module('common.logToServer', [])
  .constant('AJAX_WARNING_TIMEOUT', 4000)
  .service('$log', function () {
      this.log = function (msg) {
          JL('Angular').trace(msg);
      };
      this.debug = function (msg) {
          JL('Angular').debug(msg);
      };
      this.info = function (msg) {
          JL('Angular').info(msg);
      };
      this.warn = function (msg) {
          JL('Angular').warn(msg);
      };
      this.error = function (msg) {
          JL('Angular').error(msg);
      };
  })
  .factory('$exceptionHandler', function () {
      return function (exception, cause) {
          JL('Angular').fatalException(cause, exception);
          throw exception;
      };
  })
  .factory('logToServerInterceptor', function ($q, AJAX_WARNING_TIMEOUT) {
      var myInterceptor = {
          'request': function (config) {
              config.msBeforeAjaxCall = new Date().getTime();
              return config;
          },
          'response': function (response) {
              var warningAfter = response.config.warningAfter || AJAX_WARNING_TIMEOUT;
              if (warningAfter) {
                  var msAfterAjaxCall = new Date().getTime();
                  var timeTakenInMs =
                    msAfterAjaxCall - response.config.msBeforeAjaxCall;
                  if (timeTakenInMs > warningAfter) {
                      JL('Angular.Ajax').warn({
                          timeTakenInMs: timeTakenInMs,
                          config: response.config });
                  }
              }
              return response;
          },
          'responseError': function (rejection) {
              var errorMessage = "timeout";
              if (rejection && rejection.status && rejection.data) {
                  errorMessage = rejection.data.ExceptionMessage;
              }
              JL('Angular.Ajax').fatalException({
                  errorMessage: errorMessage,
                  status: rejection.status,
                  config: rejection.config }, rejection.data);
              return $q.reject(rejection);
          }
      };
      return myInterceptor;
  });
