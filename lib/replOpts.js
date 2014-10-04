'use strict';

var path = require('path');
var fs = require('fs');
var paste = require('copy-paste').paste;
var util = require('util');
var vm = require('vm');
var traceur = require('traceur');

var defaulteval = function (code, context, file, cb) {
  var err, result, script;
  // first, create the Script object to check the syntax
  try {
    script = vm.createScript(code, {
      filename: file,
      displayErrors: false
    });
  } catch (e) {
    err = e;
  }

  if (!err) {
    try {
      result = script.runInThisContext({ displayErrors: false });
    } catch (e) {
      err = e;
      if (err && process.domain) {
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
  return str.replace(/("|')use strict(?:\1);/, '');
};

// Taken from https://github.com/google/traceur-compiler/blob/master/src/Options.js
var trOpts = {
  annotations: false,
  arrayComprehension: false,
  arrowFunctions: true,
  asyncFunctions: false,
  blockBinding: true,
  classes: true,
  commentCallback: false,
  computedPropertyNames: true,
  debug: false,
  defaultParameters: true,
  destructuring: true,
  exponentiation: false,
  forOf: true,
  freeVariableChecker: false,
  generatorComprehension: false,
  generators: true,
  moduleName: false,
  modules: 'register',
  numericLiterals: true,
  outputLanguage: 'es5',
  propertyMethods: true,
  propertyNameShorthand: true,
  referrer: '',
  unicodeExpressions: true,
  restParameters: true,
  script: true,
  sourceMaps: false,
  spread: true,
  symbols: false,
  templateLiterals: true,
  typeAssertionModule: null,
  typeAssertions: false,
  types: false,
  unicodeEscapeSequences: true,
  validate: false,
};

var parseOptions = function (cmd) {
  var setOpt = function(val) {
    val = val === 'true' ? true : val === 'false' ? false : val;
    var vt = typeof val;
    return function (k) { if (typeof trOpts[k] === vt) { trOpts[k] = val; } };
  };

  var startingWith = function (start) {
    var ks = [];
    for (var k in trOpts) { if (k.indexOf(start) === 0) { ks.push(k); } }
    return ks;
  };

  cmd.split(/\s+/).forEach(function (opt) {
    var key, val;
    if (opt.indexOf('=') > -1) {
      var keyval = opt.split('=');
      key = keyval[0]; val = keyval[1];
    } else if (opt.indexOf('+') === 0) {
      key = opt.substr(1); val = 'true';
    } else if (opt.indexOf('-') === 0) {
      key = opt.substr(1); val = 'false';
    }
    var setFn = setOpt(val);
    if (key === 'experimental') {
      'symbols,asyncFunctions,arrayComprehension,types,annotations'.split(',').forEach(setFn);
    } else if (trOpts[key] === undefined) {
      startingWith(key).forEach(setFn);
    } else {
      setFn(key);
    }
  });
};

var commands = {};
var showHelp;
var trim = function (str) { return str.replace(/^(\s|\n)+|(\s|\n)+$/g,''); };

var commandTypes = [{
  name: 'help',
  synopsis: ':help',
  desc: 'Display the traceur-repl specific commands',
  rgxp: /^:help\s*$/,
  func: function (cmd, context, filename, callback) {
    console.log(showHelp());
    callback(null, undefined);
  }
}, {
  name: 'lsopts',
  synopsis: ':opts',
  desc: 'List the current options given to traceur',
  rgxp: /^:opts$/,
  func: function (cmd, context, filename, callback) {
    console.log(trOpts);
    callback(null, undefined);
  }
}, {
  name: 'setopts',
  synopsis: ':opts (key=value|+key|-key)+',
  desc: 'Sets the options given to traceur',
  rgxp: /^:opts\s+/,
  func: function (cmd, context, filename, callback) {
    parseOptions(cmd.replace(this.rgxp, ''));
    console.log(trOpts);
    callback(null, undefined);
  }
}, {
  name: 'paste',
  synopsis: ':paste',
  desc: 'Execute the content of the clipboard',
  rgxp: /^:paste\s/,
  func: function (cmd, context, filename, callback) {
    paste(function(err, data) {
      console.log(pasted(data));
      commands.exec(data, context, filename, callback);
    });
  }
}, {
  name: 'transpile',
  synopsis: ':t ...',
  desc: 'Transpile only the given command',
  rgxp: /^:t\s+/,
  func: function (cmd, context, filename, callback) {
    console.log(traceur.compile(cmd.replace(this.rgxp, ''), trOpts));
    callback(null, undefined);
  }
}, {
  name: 'tfile',
  synopsis: ':tfile file/path',
  desc: 'Load the given file and only transpile it (no execution)',
  rgxp: /^:tfile\s+/,
  func: function (cmd, context, filename, callback) {
    var file = path.join(process.cwd(), trim(cmd.replace(this.rgxp, '')));
    fs.readFile(file, {encoding: 'utf8'},  function (err, data) {
      if (err) { console.error(err); }
      else { commands.transpile(data, context, filename, callback); }
    });
  }
}, {
  name: 'tpaste',
  synopsis: ':tpaste',
  desc: 'Transpile only the content of the clipboard',
  rgxp: /^:tpaste\s/,
  func: function (cmd, context, filename, callback) {
    paste(function(err, data) {
      console.log(pasted(data));
      commands.transpile(data, context, filename, callback);
    });
  }
}, {
  name: 'exec',
  desc: 'Default',
  rgxp: /.*/,
  func: function (cmd, context, filename, callback) {
    cmd = noUseStrict(traceur.compile(cmd, trOpts));
    defaulteval(cmd, context, filename, callback);
  }
}];

showHelp = function () {
  var result = 'traceur-repl v0.3.1\nAvailable commands:\n';
  commandTypes.forEach(function (t) {
    if (t.name === 'exec') { return; }
    result += '  ' + t.synopsis + '\n        ' + t.desc + '\n';
  });
  return result;
};

(function(){
  commandTypes.forEach(function (t) {
    commands[t.name] = function () {
      var args = [].slice.call(arguments);
      t.func.apply(t, args);
    };
  });
}());

var traceurEval = function (cmd, ctx, f, cb) {
  commandTypes.some(function (type) {
    if (type.rgxp.exec(cmd)) { type.func(cmd, ctx, f, cb); return true; }
    return false;
  });
};

var opts = {
  prompt: 'traceur> ',
  eval: traceurEval
};

module.exports = opts;
