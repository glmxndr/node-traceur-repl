# traceur-repl

Another REPL for [traceur](https://github.com/google/traceur-compiler).

(See also the projects 
[traceur-cli](https://github.com/mikaelbr/traceur-cli) and 
[traceurepl](https://github.com/cncolder/traceurepl).)

Tested only in Linux for now...

## Install

    npm install -g traceur-repl

## Usage

In the command line, launch `traceur-repl`.

A prompt `traceur>` should open.

### `:help`: Inline help

There are several options added to the repl, launch `:help` to see them.

### `:opts`: List/set traceur options

The traceur compiler accepts many options.

#### Listing the options

Launch the command `:opts` in the traceur-repl to see the current options passed to the compiler.

#### Setting the options

To change options, you can pass arguments to `:opts`.

For instance, `:opts +debug -classes outputLanguage=es6` will have the effect of:

* setting the `debug` option to `true`,
* setting the `classes` option to `false`,
* setting the `outputLanguage` option to `'es6'`.

#### Shortcut

If you are lazy, you can spare yourself the end of the name of the option. 
For instance, the following will set to true all the options starting with 
'gener' ('generatorComprehension' and 'generators'):

    traceur> :opts +gener

You can enable (resp. disable) all of the boolean options at once by running 
`:opts +` (rsp. `:opts -`).

#### Experimental

You can enable all the experimental features at the same time with:

    traceur> :opts +experimental

(Disable with `-experimental`.)

You have to write 'experimental' in full though, no shortcut for that one.

### `:t`: Show traceur output for command

If you want to see the result of traceur transpilation, prepend your command by `:t`.
In this case, the transpiled code is not executed, only shown.
For instance:

    traceur> :t let x = 1
    "use strict";
    var x = 1;

### `:tpaste`: Show traceur output for content of clipboard

If you want to see how traceur transpiles the content of your clipboard, use `:tpaste`.
The section between '<<<' and '>>>' is the content of your clipboard, the rest 
is the transpilation result.

    traceur> :tpaste
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

### `:tfile`: Show traceur output for content of a file

If you want to see how traceur transpiles the content of a file, use `:tfile`.

    traceur> :tfile test/loadMe.js
    var x = 1;
    var add = (function(x) {
      var y = arguments[1] !== (void 0) ? arguments[1] : 1;
      return x + y;
    });
    var y = add(x, x);
    y;


### `:paste`: Execute the content of your clipboard

If you want to execute the content of your clipboard, use `:paste`. The content
pasted is executed. (The section between '<<<' and '>>>' is the content of your 
clipboard.)

    traceur> :paste
    <<<
    ...let x = 1
    ...let add = (x,y=1) => x+y
    >>>

### Use as a normal node repl

Just type javascript code, and it will be transpiled/executed using the latest 
traceur-compiler version available.

    traceur> let x = 1
    undefined
    traceur> x
    1
