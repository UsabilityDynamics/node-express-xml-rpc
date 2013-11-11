var express     = require( 'express' );
var xrpc        = require( '..' );
var user_card   = require( 'faker' ).Helpers.userCard;
var app         = express();

app.configure( function configure() {
  console.log( 'Starting Express server with XMl-RPC proxy.' );

  // Configure primary settings.
  app.set( 'port', process.env.PORT || 3000 );
  app.set( 'host', process.env.HOST || 'localhost' );

  // Configure XML-RPC Proxy Options.
  app.set( 'proxy-options', {

  });

  // Standard Middleware.
  app.use( express.json() );
  app.use( express.logger( 'dev' ) );
  app.use( express.urlencoded() );

  // XML-RPC Proxy Middleware.
  app.use( '/rpc', xrpc.createProxy( app ) );

  // Single User,
  app.get( '/user/:id', function user( req, res, next ) {

    res.send({
      success: true,
      user: user_card()
    });

  });

  // List Users.
  app.get( '/users', function user( req, res, next ) {

    res.send({
      success: true,
      users: [ user_card(), user_card(), user_card(), user_card() ]
    });

  });

  // Base.
  app.get( '/', function user( req, res, next ) {

    res.send({
      success: true,
      message: 'Womp womp..'
    })

  });

  app.listen( app.get( 'port' ), app.get( 'host' ), function ready() {
    console.log( 'Listening for RETS and XML-RPC calls on [%s:%s].', app.get( 'host' ), app.get( 'port' ) );
  });

});
