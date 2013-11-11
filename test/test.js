var assert = require( 'assert' );
var os = require( 'os' );
var host = os.hostname();
var http = require( 'http' );
var express = require( 'express' );
var xrpc = require( '..' );
var xmlrpc = require( 'xmlrpc' );

module.exports = {

  /**
   * Start XML-RPC Server
   *
   * @param done
   */
  before: function( done ) {

    // Create Express Application.
    module.app = express();

    // Configure Application.
    module.app.configure( function() {

      // Standard Middleware
      this.use( express.json() );

      // XML-RPC Middleware
      this.use( xrpc.xmlRpc );

      // XML-RPC Router
      this.post( '/RPC', xrpc.route( {

        /**
         * Echo Request
         *
         * @param msg
         * @param callback
         */
        echo: function( msg, callback ) {
          callback( null, msg );
        },

        /**
         * Return Pong
         *
         * @param msg
         * @param callback
         */
        ping: function ping( msg, callback ) {

          callback( null, {
            success: true,
            message: 'pong'
          });
        },

        /**
         * Return Headers
         * @param msg
         * @param callback
         */
        headers: function headers( msg, callback ) {

          callback( null, {
            success: true,
            message: 'pong',
            headers: this.headers
          });
        }

      } ) );

      this.server = http.createServer( module.app ).listen( process.env.PORT || 18776, 'localhost', function() {
        // console.log( 'Server started on [%s:%s].', this.address().address, this.address().port );
        done();
      } );

    });

  },

  "XML-RPC": {

    /**
     * Echo Test
     * @param done
     */
    "can make echo request.": function( done ) {

      var client = xmlrpc.createClient({
        host: module.app.server.address().address,
        port: module.app.server.address().port,
        path: '/RPC'
      });

      // Sends a method call to the XML-RPC server
      client.methodCall( 'echo', [{ test: 999 }], function( error, value ) {
        assert.equal( value.test, 999 );
        done();
      });

    },

    /**
     * Ping Pong test.
     *
     * @param done
     */
    "can make ping-pong request.": function( done ) {

      var client = xmlrpc.createClient({
        host: module.app.server.address().address,
        port: module.app.server.address().port,
        path: '/RPC'
      });

      // Sends a method call to the XML-RPC server
      client.methodCall( 'ping', [{ "test": true }], function( error, res ) {
        assert.equal( res.success, true );
        assert.equal( res.message, 'pong' );
        done();
      });

    },

    /**
     * Test Server Header Reading
     *
     * @param done
     */
    "can handle headers.": function( done ) {

      var client = xmlrpc.createClient({
        host: module.app.server.address().address,
        port: module.app.server.address().port,
        path: '/RPC'
      });

      // Sends a method call to the XML-RPC server
      client.methodCall( 'headers', [{ "test": true }], function( error, res ) {
        assert.equal( res.success, true );
        assert.equal( res.headers['user-agent'], 'NodeJS XML-RPC Client' );
        done();
      });

    }

  },

  /**
   * Shutdown Server
   *
   * @param done
   */
  after: function( done ) {
    module.app.server.close();
    done();
  }

};
