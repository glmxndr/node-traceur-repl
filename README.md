# traceur-repl

## Install

    npm install -g traceur-repl

## Usage

In the command line, launch `traceur-repl`.

A prompt `traceur>` should open.

Just type es6 code, and it will be transpiled/executed using the latest 
traceur-compiler version available.

    traceur> let x = 1
    undefined
    traceur> x
    1

If you want to see how traceur transpiles in ES5, prepend your command by `:5`.
In this case, the transpiled code is not executed, only shown.
For instance:

    traceur> :5 let x = 1
    "use strict";
    var x = 1;

If you want to execute the content of your clipboard, use `:paste`.

    traceur> :paste
    <<<
    ...let x = 1
    ...let add = (x,y=1) => x+y
    >>>
    
If you want to see how traceur transpiles the content of your clipboard, use `:5paste`.

    traceur> :5paste
    <<<
    ...let x = 1
    ...let add = (x,y=1) => x+y
    >>>
    "use strict";
    var x = 1;
    var add = (function(x) {
      var y = arguments[1] !== (void 0) ? arguments[1] : 1;
      return x + y;
    });
