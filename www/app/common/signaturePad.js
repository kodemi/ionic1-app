(function(){ 'use strict';
    angular.module('common')
      .directive('signaturePad', signaturePad);

    function signaturePad() {
          return {
              restrict: 'E',
              template: "<div class='signature-container'><canvas class='signature'></canvas><a class='close signature-clear button button-icon icon ion-refresh' ng-click='clear()'></a></div>",
              replace: true,
              scope: {
                  onSignature: '&',
                  onSignatureClear: '&'
              },
              link: function(scope, element, attrs) {
                  var canvas, signaturePad;
                  function resizeCanvas(canvas) {
                      var ratio =  window.devicePixelRatio || 1;
                      canvas.width = canvas.offsetWidth * ratio;
                      canvas.height = canvas.offsetHeight * ratio;
                      canvas.getContext("2d").scale(ratio, ratio);
                  }
                  canvas = element.children('.signature')[0];
                  signaturePad = new SignaturePad(canvas);
                  signaturePad.minWidth = 0.8;
                  signaturePad.maxWidth = 3.0;
                  signaturePad.onEnd = function(){
                      scope.onSignature({sig: signaturePad.toDataURL()});
                  };
                  scope.clear = function() {
                      signaturePad.clear();
                      scope.onSignatureClear();
                  };
                  window.onresize = function() { resizeCanvas(canvas); };
                  resizeCanvas(canvas);
              }
          }
      }
}());