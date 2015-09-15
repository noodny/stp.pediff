var nstatic = require('node-static'),
    socketio = require('socket.io'),
    _ = require('lodash'),
    Proxy = require('./proxy.js'),
    getPort = require('get-port');

var Server = function(config) {
    this.config = config || {};
    this.initialize();
};

Server.prototype = {
    initialize: function() {
        this.bundlesRunning = 0;

        getPort(function(err, port) {
            var staticServer = new nstatic.Server('./../public/'),
                respond = function(req, res) {
                    staticServer.serve(req, res, function(err) {
                        if(err) {
                            res.writeHead(err.status, err.headers);
                            res.end();
                        }
                    });
                };

            this.server = require('http').createServer(function(req, res) {
                req.addListener('end', respond.bind(staticServer, req, res)).resume();
            });

            this.io = socketio.listen(this.server);

            this.server.listen(port, function() {
                Proxy.emit('server:ready', this.server.address());

                this.setupIncomingListeners();
                this.setupOutgoingListeners();
            }.bind(this));
        }.bind(this))
    },
    setupIncomingListeners: function() {
        this.io.on('connection', function(socket) {
            socket.on('run', function(specs) {
                if(_.isString(specs)) {
                    if(specs === 'all') {
                        Proxy.emit('server:run:all');
                    }
                    specs = [specs]
                }
            });
        });
    },
    setupOutgoingListeners: function() {
        Proxy.on('bundle:started', function() {
            this.bundlesRunning++;
            this.io.emit('status', 'busy');
        }.bind(this));

        Proxy.on('bundle:finished', function() {
            if(--this.bundlesRunning === 0) {
                this.io.emit('status', 'idle');
            }
        }.bind(this));
    }
};

module.exports = Server;
