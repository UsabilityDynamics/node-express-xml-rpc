/**
 * Express-XmlRpc - XML-RPC middleware for Express
 *
 * @example:
 *      // assuming app is an express server, use just prior to router in config, e.g.
 *      var express = require('express'),
 *      xrpc = require('express-xmlrpc'),
 *      app = express();
 *
 *      app.configure(function () {
 *        app.use(express.methodOverride());
 *        app.use(xrpc.xmlrpc);
 *        app.use(server.router)
 *      });
 *
 *      app.listen(3000);
 *
 * @param options
 * @constructor
 * @returns {RPC}
 */
function RPC( options ) {

  return this;

}

/**
 * RPC Instance Properties.
 *
 */
Object.defineProperties( RPC.prototype, {
  xmlRpc: {
    /**
     * Parses Request Body.
     *
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    value:function xmlRpc( req, res, next ) {
      RPC.debug( 'middleware on [%s] [%s]', req.method, req.path || '/' );

      // Only attempt to parse text/xml Content-Type
      var ct = req.headers['content-type'] || '';
      var mime = ct.split( ';' )[0];

      if( 'text/xml' !== mime ) {
        return next();
      }

      var raw = [];

      var parser = new RPC.prototype.parser({
        onDone: function onDone( data ) {
          // console.log( 'onDone' );
          req.body_XMLRPC = data;
          next();
        },
        onError: function onError( msg ) {
          req.body_XMLRPC = false;
          next();
        }
      });

      // If there's raw body data, try parsing that instead of hooking up events.
      if( req.rawBody ) {
        console.log( 'req.rawBody' );
        return parser.parseString( req.rawBody ).finish();
      }

      req.setEncoding( 'utf8' );

      req.on( 'data', function onData( chunk ) {
        raw.push( chunk );
        parser.parseString( chunk );
      });

      req.once( 'end', function onceEnd() {
        //console.log( 'onceEnd' );
        req.rawBody = raw.join( '' );
        parser.finish();
      });

    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  _router: {
    value: function _router( req, res, next ) {
      // console.log( '_router', this.methods );

      var context = this;

      if( !req.body_XMLRPC ) {
        return res.send( new RPC.prototype.fault( -32700, 'Parse Error. Request data not well formed.' ).xml() );
      }

      if( !req.body_XMLRPC ) {
        console.log( 'req.body_XMLRPC not defined' );
        req.body_XMLRPC = {};
      }

      var params = req.body_XMLRPC.params;

      var method = RPC.prototype.getRef( this.methods, req.body_XMLRPC.method );

      if( method !== undefined ) {
        RPC.debug( 'processing XML-RPC Route on [%s] [%s] for method [%s] of type [%s]', req.method, req.path || '/', req.body_XMLRPC.method, typeof method )

        try {

          // Add Express req/res/next properties.
          //context.method      = context.method || method;
          context.headers     = context.headers || req.headers || {};
          context.session     = context.session|| req.session || {};
          context.req         = context.req || req || {};
          context.res         = context.res || res || {};
          context.next        = context.next || next || RPC.prototype.utility.noop;

          function originalSend() {
            RPC.prototype.utility.express.response.send.apply( res, arguments );
          }

          /**
           * Wrapper for Send Mehod.
           *
           * @param error
           * @param data
           * @returns {*}
           */
          context.res.send = function modifiedSend( error, data ) {
            // RPC.debug( 'modifiedSend', error, data );

            var args = [].slice.call( arguments );

            if( args.length === 1 ) {
              //return send.call( context, new RPC.prototype.response( [ args[0] ] ).xml() );
              return originalSend( new RPC.prototype.response( [ args[0] ] ).xml() );
            }

            if( !error ) {
              //send.call( context, new RPC.prototype.response( [data] ).xml() );
              return originalSend( new RPC.prototype.response( [data] ).xml() );
            }

            return originalSend( new RPC.prototype.fault( error.code || 0, error.message || error ).xml() );

          };

          if( params.length === 1 ) {
            context.req.body = params[0];
          } else {
            context.req.body = params;
          }
          // If method does is not prototypal, apply our custom context.
          if( !method.name && !method.prototype ) {
            return method.call( context, context.req, context.res, context.next );
          }

          // For prototypal methods, call them as they are.
          return method( context.req, context.res, context.next );

        } catch( e ) {
          res.send( new RPC.prototype.fault( -32500, 'Unexpected exception ' + e ).xml() );
          return next( e );
        }

      } else {
        return res.send( new RPC.prototype.fault( -32601, 'requested method ' + method + ' not found' ) );
      }

    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  route: {
    value: function route( handlers ) {
      RPC.debug( 'handler declaration' );

      var context;
      var methods;

      if( handlers.xmlRpcMethods === undefined ) {
        context = this;
        context.methods = handlers;
      } else {
        context = handlers;
        context.methods = handlers.xmlRpcMethods;
      }

      return RPC.prototype._router.bind( context );

    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  router: {
    value: function router( routes ) {

      var app = RPC.prototype.utility.express.call();

      var xrpc = new RPC;

      // Session Support.
      // app.use( express.cookieParser( 'sdflsakjflksjflkasdjf' ) );
      // app.use( express.session() );

      app.use( xrpc.xmlRpc );

      app.post( '/', RPC.prototype.route( routes ) );

      return app;

    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  getRef: {
    value: function getRef( o, s ) {

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

    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  utility: {
    value: {
      express: require( 'express' ),
      noop: function noop() {}
    },
    enumerable: false,
    configurable: true,
    writable: true
  },
  parser: {
    value: require( './xmlrpc-parser' ),
    enumerable: true,
    configurable: true,
    writable: true
  },
  response: {
    value: require( './xmlrpc-response' ),
    enumerable: true,
    configurable: true,
    writable: true
  },
  fault: {
    value: require( './xmlrpc-fault' ),
    enumerable: true,
    configurable: true,
    writable: true
  }
});

/**
 * RPC Constructor Properties.
 *
 */
Object.defineProperties( module.exports = RPC, {
  debug: {
    value: require( 'debug' )( 'connect:rpc' ),
    enumerable: false,
    configurable: true,
    writable: true
  },
  xmlRpc: {
    value: RPC.prototype.xmlRpc,
    enumerable: true,
    configurable: true,
    writable: true
  },
  route: {
    value: RPC.prototype.route,
    enumerable: true,
    configurable: true,
    writable: true
  },
  router: {
    value: RPC.prototype.router,
    enumerable: true,
    configurable: true,
    writable: true
  },
  XmlRpcResponse: {
    value: RPC.prototype.response,
    enumerable: false,
    configurable: true,
    writable: true
  },
  XmlRpcFault: {
    value: RPC.prototype.fault,
    enumerable: false,
    configurable: true,
    writable: true
  },
  XmlRpcParser: {
    value: RPC.prototype.parser,
    enumerable: false,
    configurable: true,
    writable: true
  },
  createProxy: {
    value: require( './xmlrpc-proxy' ).create,
    enumerable: true,
    configurable: true,
    writable: true
  },
  engine: {
    value: require( './xmlrpc-engine' ),
    enumerable: true,
    configurable: true,
    writable: true
  }
});

