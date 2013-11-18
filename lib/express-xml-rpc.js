/**
 * Express-XmlRpc - XML-RPC middleware for Express
 *
 * based on rsscloud-node's xmlrpc module: https://github.com/lmorchard/rsscloud-node
 * specs: http://www.xmlrpc.com/spec
 *
 * usage:
 * // assuming app is an express server, use just prior to router in config, e.g.
 * var express = require('express'),
 * xrpc = require('express-xmlrpc'),
 * app = express();
 *
 * app.configure(function () {
 * app.use(express.methodOverride());
 * app.use(xrpc.xmlrpc);
 * app.use(server.router)
 * });
 *
 * app.listen(3000);
 *
 */

var XmlRpcParser    = require( './xmlrpc-parser' );
var XmlRpcResponse  = require( './xmlrpc-response' );
var XmlRpcFault     = require( './xmlrpc-fault' );
var XmlRpcProxy     = require( './xmlrpc-proxy' );
var XmlRpcEngine    = require( './xmlrpc-engine' );
var debug           = require( 'debug' )( 'express:xml-rpc' );

exports.createProxy = XmlRpcProxy.create;
exports.engine  = XmlRpcEngine;

exports.xmlRpc = function xmlRpc( req, res, next ) {
  debug( 'middleware on [%s] [%s]', req.method, req.path || '/' )
  
  // Only attempt to parse text/xml Content-Type
  var ct = req.headers['content-type'] || '';
  var mime = ct.split( ';' )[0];

  if( 'text/xml' != mime ) {
    return next();
  }

  var raw = [];

  var parser = new XmlRpcParser( {
    onDone: function( data ) {
      req.body_XMLRPC = data;
      next();
    },
    onError: function( msg ) {
      req.body_XMLRPC = false;
      next();
    }
  });

  // If there's raw body data, try parsing that instead of hooking up events.
  if( req.rawBody ) {
    return parser.parseString( req.rawBody ).finish();
  }

  req.setEncoding( 'utf8' );

  req.on( 'data', function( chunk ) {
    raw.push( chunk );
    parser.parseString( chunk );
  });

  req.on( 'end', function() {
    req.rawBody = raw.join( '' );
    parser.finish();
  });

};

// returns a route handler for an express server which dispatches XML-RPC
// requests to handlers. The return value from a handler is transformed from
// javascript into an XML-RPC response and sent.  Methods invoked consist
// of parameters and an additional argument of 'callback' which has a signature
// of callback(err, val) where val is data to respond to request with, or
// err is an error which will be responded as an xmlrpc fault
// (err.code can be set to a specific fault code if desired)
// note that optionally an object can be passed with a property of xmlRpcMethods
// containing methods.
// Also note that nested properties will be referenced as nested, e.g.
// xmlrpc call for 'blogger.getUsersBlogs' will reference to function A below
// { blogger: { getUsersBlogs: function A(...) { ... } } }
//
//     app.post('/RPC2', xrpc.route({
//         echo: function (param, callback) {
//             callback(null, 'Echo: ' + param);
//             // or if error,  callback(err);
//         }
//     }));
exports.route = function route( handlers ) {
  debug( 'handler declaration' )
  
  var context;
  var methods;

  if( handlers.xmlRpcMethods === undefined ) {
    context = this;
    methods = handlers;
  } else {
    context = handlers;
    methods = handlers.xmlRpcMethods;
  }

  return function xmlRpcRouter( req, res, next ) {

    if( !req.body_XMLRPC ) {
      res.send( new XmlRpcFault( -32700, 'parse error. not well formed' ).xml() );
    }
    
    if( !req.body_XMLRPC ) {
      console.log( 'req.body_XMLRPC not defined' );
      req.body_XMLRPC = {};
    }

    var params = req.body_XMLRPC.params;
    var method = getRef( methods, req.body_XMLRPC.method );

    if( method !== undefined ) {
      debug( 'processing XML-RPC Route on [%s] [%s] for method [%s] of type [%s]', req.method, req.path || '/', req.body_XMLRPC.method, typeof method )

      try {

        // Add Express req/res/next properties.
        //context.headers     = req.headers || {};
        //context.session     = req.session || {};
        context.req         = req || {};
        context.res         = res || {};
        context.next        = next || function noop() {};

        context.res._send = function modifiedSend( err, rv ) {
          var args = [].slice.call( arguments );

          if( args.length === 1 ) {
            return  __send( context, new XmlRpcResponse( [rv] ).xml() );
          }

          if( !err ) {
            __send.call( context, new XmlRpcResponse( [rv] ).xml() );
          } else {
            __send( context,  new XmlRpcFault( err.code || 0, err.message || err ).xml() );
          }

        }

        if( params.length === 1 ) {
          context.req.body = params[0];
        } else {
          context.req.body = params;
        }

        return method.call( context, context.req, context.res, context.next );

      } catch( e ) {
        res.send( new XmlRpcFault( -32500, 'Unexpected exception ' + e ).xml() );
        return next( e );
      }

    } else {
      return res.send( new XmlRpcFault( -32601, 'requested method ' + method + ' not found' ) );
    }

  };

};

function getRef( o, s ) {
  
  s = s || '';
  
  s = s.replace( /\[(\w+)\]/g, '.$1' );
  s = s.replace( /^\./, '' );
  var a = s.split( '.' );
  while( a.length ) {
    var n = a.shift();
    if( n in o ) {
      o = o[n];
    } else {
      return;
    }
  }
  return o;
}