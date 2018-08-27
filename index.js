var Router = require('express/lib/router/index');
var flatten = require('array-flatten');

var LayerWrapper = require('./layer-wrapper');

var use = Router.use;
Router.use = function (fn) {
    var offset = 0;
    var path = '/';

    if (typeof fn !== 'function') {
        var arg = fn;

        while (Array.isArray(arg) && arg.length !== 0) {
            arg = arg[0];
        }

        if (typeof arg !== 'function') {
            offset = 1;
            path = fn;
        }
    }

    var callbacks = flatten(Array.prototype.slice.call(arguments, offset));
    var result = use.call(this, path, callbacks);

    for (var i = 0; i < callbacks.length; i++) {
        var layer = this.stack.pop();
        this.stack.push(new LayerWrapper(path, layer, {
            sensitive: this.caseSensitive,
            strict: false,
            end: false
        }));
    }

    return result;
};

var route = Router.route;
Router.route = function (path) {
    var result = route.apply(this, arguments);

    var layer = this.stack.pop();
    this.stack.push(new LayerWrapper(path, layer, {
        sensitive: this.caseSensitive,
        strict: this.strict,
        end: true
    }));

    return result;
};