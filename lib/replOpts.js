'use strict';

var path = require('path');
var fs = require('fs');
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
  return str.replace(/("|')use strict(?:\1);/, '');
};

var commandHistory = {
  lines: [],
  clean: function () { this.lines = []; return this; },
  push: function (line) {
    var lines = this.lines;
    var last = lines[lines.length - 1];
    if (line !== last) { lines.push(line); }
    return this;
  },
  toString: function () {
    return this.lines.join('\n');
  }
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
  var opts = cmd.split(/\s+/);
  opts.forEach(function (opt) {
    if (opt.indexOf('=') > -1) {
      var keyval = opt.split('=');
      trOpts[keyval[0]] =
          keyval[1] === 'true' ? true
        : keyval[1] === 'false' ? false
        : keyval[1];
    } else if (opt.indexOf('+') === 0) {
      trOpts[opt.substr(1)] = true;
    } else if (opt.indexOf('-') === 0) {
      trOpts[opt.substr(1)] = false;
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
  var result = 'traceur-repl v0.2.0\nAvailable commands:\n';
  commandTypes.forEach(function (t) {
    if (t.name === 'exec') { return; }
    result += '  ' + t.synopsis + '\n        ' + t.desc + '\n';
  });
  return result;
};

var es6eval = function (cmd, context, filename, callback) {
  commandTypes.some(function (type) {
    if (type.rgxp.exec(cmd)) {
      type.func(cmd, context, filename, callback);
      return true;
    }
    return false;
  });
};

(function(){
  commandTypes.forEach(function (t) {
    commands[t.name] = function () {
      var args = [].slice.call(arguments);
      t.func.apply(t, args);
    };
  });
}());

var opts = {
  prompt: 'traceur> ',
  eval: es6eval
};

module.exports = opts;
