var debug           = require( 'debug' )( 'express:xml-rpc:engine' );

exports.renderFile = function( path, options, fn ) {
  debug( 'renderFile' );

  var key = path + ':string';

  if ('function' == typeof options) {
    fn = options, options = {};
  }

  options.filename = path;

  /**
   *
  var str;

  try {
    str = options.cache ? cache[key] || (cache[key] = read(path, 'utf8')) : read(path, 'utf8');
  } catch (err) {
    fn(err);
    return;
  }
   */

  fn( null, exports.render(str, options) );
};


var compile = exports.compile = function( str, options ){
  options = options || {};

  var output = function( locals, filters, escape, rethrow ){
    return "<xml>BLAH</xml>";
  }

  if (options.client) {
    return fn;
  }

  return function(locals){
    return output.call(this, locals, filters, escape, rethrow);
  }
};


exports.render = function( str, options ){
  var fn;
  var options = options || {};

  options.__proto__ = options.locals;
  return fn.call(options.scope, options);
};


exports.__express = exports.renderFile;
