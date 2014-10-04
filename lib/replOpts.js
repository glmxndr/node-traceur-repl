/*jshint evil: true*/
'use strict';

var paste = require('copy-paste').paste;
var util = require('util');
var vm = require('vm');
var traceur = require('traceur');
var debug = util.debuglog('repl');


var defaulteval = function (code, context, file, cb) {
  var err, result, script;
  // first, create the Script object to check the syntax
  try {
    script = vm.createScript(code, {
      filename: file,
      displayErrors: false
    });
  } catch (e) {
    debug('parse error %j', code, e);
    err = e;
  }

  if (!err) {
    try {
      result = script.runInThisContext({ displayErrors: false });
    } catch (e) {
      err = e;
      if (err && process.domain) {
        debug('not recoverable, send to domain');
        process.domain.emit('error', err);
        process.domain.exit();
        return;
      }
    }
  }

  cb(err, result);
};

var pasted = function (str) {
  var prepend = function(line){ return '...' + line; };
  return ['<<<'].concat(str.split('\n').map(prepend)).concat(['>>>']).join('\n');
};

var noUseStrict = function (str) {
  return str.replace(/^\s*"use strict";/, '');
};

var commandTypes = [{
  name: 'Compile only',
  rgxp: /^:5\s/,
  func: function (cmd, context, filename, callback) {
    console.log(traceur.compile(cmd.replace(this.rgxp, '')));
    callback(null, undefined);
  }
}, {
  name: 'Compile only clipboard',
  rgxp: /^:5(?:clip(?:board)?|paste)\s/,
  func: function (cmd, context, filename, callback) {
    paste(function(err, data) {
      console.log(pasted(data));
      console.log(traceur.compile(data));
      callback(null, undefined);
    });
  }
}, {
  name: 'Paste',
  rgxp: /^:(?:clip(?:board)?|paste)\s/,
  func: function (cmd, context, filename, callback) {
    paste(function(err, data) {
      console.log(pasted(data));
      cmd = noUseStrict(traceur.compile(data));
      defaulteval(cmd, context, filename, callback);
    });
  }
}, {
  name: 'Default',
  rgxp: /.*/,
  func: function (cmd, context, filename, callback) {
    cmd = noUseStrict(traceur.compile(cmd));
    defaulteval(cmd, context, filename, callback);
  }
}];


var es6eval = function (cmd, context, filename, callback) {
  commandTypes.some(function (type) {
    if (type.rgxp.exec(cmd)) {
      type.func(cmd, context, filename, callback);
      return true;
    }
    return false;
  });
};

var opts = {
  prompt: 'traceur> ',
  eval: es6eval
};

module.exports = opts;
