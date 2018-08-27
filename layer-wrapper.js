var Layer = require('express/lib/router/layer');
var pathRegexp = require('express/node_modules/path-to-regexp');

var DEFAULT_DELIMITER = '/';
var DEFAULT_DELIMITERS = './';

var PATH_REGEXP = new RegExp([ '(\\\\.)', '(?:<(\\w+)(?:\\:(\\w+))?>)'].join('|'), 'g');

function parse (str, options) {
    var tokens = [];
    var key = 0;
    var index = 0;
    var path = '';
    var defaultDelimiter = (options && options.delimiter) || DEFAULT_DELIMITER;
    var delimiters = (options && options.delimiters) || DEFAULT_DELIMITERS;
    var pathEscaped = false;
    var res;

    while ((res = PATH_REGEXP.exec(str)) !== null) {
        var m = res[0];
        var escaped = res[1];
        var offset = res.index;
        path += str.slice(index, offset);
        index = offset + m.length;

        if (escaped) {
            path += escaped[1];
            pathEscaped = true;
            continue;
        }

        var prev = '';
        var next = str[index];
        var name = res[2];
        var type = res[3];

        if (!pathEscaped && path.length) {
            var k = path.length - 1;

            if (delimiters.indexOf(path[k]) > -1) {
                prev = path[k];
                path = path.slice(0, k);
            }
        }

        if (path) {
            tokens.push(path);
            path = '';
            pathEscaped = false;
        }

        var partial = prev !== '' && next !== undefined && next !== prev;
        var delimiter = prev || defaultDelimiter;
        var pattern = null;

        if (type === 'int') {
            pattern = '-?\\d+';
        }

        tokens.push({
            name: name || key++,
            prefix: prev,
            delimiter: delimiter,
            partial: partial,
            type: type,
            pattern: pattern ? '(' + pattern + ')' : '[^' + escapeString(delimiter) + ']+?'
        });
    }

    // Push any remaining characters.
    if (path || index < str.length) {
        tokens.push(path + str.substr(index));
    }

    return tokens;
}

function escapeString (str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')
}

function LayerWrapper(path, layer, options) {
    Object.assign(this, layer);

    this.options = options;
    this.original_path = path;

    var tokens = parse(path);

    var escape_path = '';

    this.type_of_key = {};
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
            escape_path += token;
            continue;
        }

        escape_path += token.prefix;
        escape_path += ':' + token.name;
        escape_path += token.pattern;

        this.type_of_key[token.name] = token.type;
    }

    var is_fast_star = this.regexp.fast_star;
    var is_fast_slash = this.regexp.fast_slash;

    this.regexp = pathRegexp(escape_path, this.keys = [], options);
    this.regexp.fast_star = is_fast_star;
    this.regexp.fast_slash = is_fast_slash;
}

LayerWrapper.prototype = Object.create(Layer.prototype);
LayerWrapper.prototype.constructor = LayerWrapper;

LayerWrapper.prototype.match = function (path) {
    var result = Layer.prototype.match.apply(this, arguments);
    if (this.params === undefined) return result;

    for (var key in this.params) {
        if (!this.params.hasOwnProperty(key)) continue;

        var type = this.type_of_key[key];

        switch (type) {
            case 'int':
            case 'integer':
                this.params[key] = parseInt(this.params[key]);
                break;
        }
    }

    return result;
};

module.exports = LayerWrapper;