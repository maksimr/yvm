var compose = require('mout/function/compose');
var tcRequest = require('../lib/team-city-request');
var request = require('../lib/request');
var http = require('http');
var oboe = require('oboe');
var fs = require('fs');


module.exports = function(params, onDone) {
  onDone = onDone || require('mout/function/identity');
  var buildNumber = params.buildNumber;

  var artifactsRequest = compose(
    tcRequest.createBuildArtifactsRequest
  )(tcRequest.createRequest(params.hostname));

  var requestArtifactsUrl = compose(
    tcRequest.interpolate({
      buildTypeId: params.buildTypeId,
      buildNumber: buildNumber
    }),
    request.stringify
  )(artifactsRequest);


  return oboe({
    url: requestArtifactsUrl,
    headers: artifactsRequest.headers
  }).node('!file.*', function(file) {
    if (file.name.indexOf('.jar') > -1) {
      return requestJar(file.name);
    }
  }).fail(function(error){
    console.error(error);
  });

  function requestJar(jarArtifactName) {
    var requestUrl = compose(
      tcRequest.interpolate({
        artifactName: jarArtifactName,
        buildTypeId: params.buildTypeId,
        buildNumber: buildNumber
      }),
      request.stringify,
      tcRequest.createBuildArtifactRequest
    )(tcRequest.createRequest(params.hostname));

    return http.get(requestUrl, function(response) {
      var file = fs.createWriteStream('/tmp/youtrack-' + buildNumber + '.jar');

      response.pipe(file);
      response.on('end', onDone.bind(null, null, file));
      response.on('end', saveBuild.bind(null, file));
      response.on('error', onDone);

      if (params.progress) {
        printProgress(response);
      }
    });
  }


  function saveBuild(file) {
    if (params.save) {
      require('./install')(params)(file.path, {
        version: buildNumber
      });
    }
  }


  function printProgress(response) {
    var len = parseInt(response.headers['content-length'], 10);
    var cur = 0;


    response.on('data', function(chunk) {
      cur += chunk.length;
      printMessage(createMessage());
    });


    function createMessage() {
      var percents = Number((100.0 * cur / len).toFixed(0));
      return new Array(percents).join('.');
    }

    function printMessage(message) {
      var readline = require('readline');

      readline.cursorTo(process.stdout, 0);
      process.stdout.clearLine();
      process.stdout.write(message);
    }
  }
};
