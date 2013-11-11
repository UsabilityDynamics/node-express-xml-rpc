/**
 * Create XML-RPC Proxy
 *
 * @param {Object} app
 * @param {Object} options
 * @constructor
 */
function XmlRpcProxy( app, options ) {

  this.options    = require( 'extend' )( options || {}, XmlRpcProxy.defaults );
  this.app        = app || require( 'express' ).call();
  this.proxy      = require( 'http-proxy' );
  this.xrpc      = require( 'http-proxy' );

  // Map Routes.
  process.nextTick( this.setupServer.bind( this ) );

  // Return Route Handler
  return this.handleMiddleware;

}

/**
 * Proxy Instance.
 *
 */
Object.defineProperties( XmlRpcProxy.prototype, {
  setupServer: {
    value: function setupServer() {
      console.log( 'setupServer' );

      if( !this.app.routes ) {
        return this;
      }

      var app       = this.app;
      var options   = this.options;
      var actions   = {};
      var request   = require( 'request' );

      // Iterate over method groups.
      for( var _method in this.app.routes ) {
        var _routes = this.app.routes[ _method ];

        // Iterate over routes in method.
        _routes.forEach( function( _route, count ) {

          var _action = XmlRpcProxy.normalizeName( _method, _route.path );

          Object.defineProperty( actions, _action, {
            /**
             * XML-RPC Single Action Handler
             *
             */
            value: function method( msg, callback ) {
              console.log( 'Handling XML-RPC action [%s], proxying to [%s] [%s].', _action, _method, _route.path );

              request({
                url: _route,
                method: _method,
                body: {
                  body_XMLRPC: {}
                }
              }, function( error, req, body ) {

                callback( null, body );

              });

            },
            enumerable: true,
            configurable: true,
            writable: true
          });

          console.log( 'Configuring rule #[%d] [%s] method for [%s] route, naming action [%s].', count, _method, _route.path, _action );

        });

      }

      // Create XML-RPC Handler.
      app.post( options.path, require( './express-xml-rpc' ).route( actions ) );

    },
    enumerable: true,
    configurable: false,
    writable: false
  },
  handleMiddleware: {
    value: function handleMiddleware( req, res, next ) {
      console.log( 'handleMiddleware' );
      next();
    },
    enumerable: true,
    configurable: false,
    writable: false
  }
});

/**
 * Proxy Consructor.
 */
Object.defineProperties( module.exports = XmlRpcProxy, {
  create: {
    /**
     * Create Server
     *
     * @param app
     * @param options
     * @returns {XmlRpcProxy}
     */
    value: function create( app, options ) {
      return new XmlRpcProxy( app, options );
    },
    enumerable: true,
    configurable: false,
    writable: false
  },
  normalizeName: {
    /**
     * Rename REST Route to XML-RPC Method.
     *
     * GET /user/:id  -> getUserId
     * GET /users     -> getUsers
     * GET /          -> getAll
     *
     * @param method
     * @param path
     * @returns {string}
     */
    value: function normalizeName( method, path ) {
      var string = require( 'string' );

      path = string( path ).replaceAll( '/', '_' ).s;
      path = string( path ).replaceAll( ':', '' ).s;
      path = string( path ).camelize().s;
      path = path || 'All';

      return [ method, path ].join( '' );

    },
    enumerable: true,
    configurable: true,
    writable: true
  },
  defaults: {
    value: {
      path: '/rpc'
    },
    enumerable: false,
    configurable: true,
    writable: true
  }
});