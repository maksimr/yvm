var fs = require('fs');
var printBuildNumber = require('../lib/print-build-number').printBuildNumber;


module.exports = function(config) {
  function ls() {
    var rootDir = config.rootDir;

    if (fs.existsSync(rootDir)) {
      return fs.readdirSync(rootDir)
        .sort(function(a, b) {
          return toNumber(b) - toNumber(a);
        });
    }

    return [];
  }

  ls.print = function() {
    ls().forEach(printBuildNumber.bind(null, true));
  };

  return ls;

  function toNumber(x) {
    return Number(x.replace('.'));
  }
};
