#!/usr/bin/env node

var Pediff = require('./lib/pediff.js'),
    Server = require('./lib/server.js'),
    Proxy = require('./lib/proxy.js'),
    parseConfig = require('./lib/config.js'),
    meow = require('meow'),
    path = require('path'),
    fs = require('fs'),
    cpr = require('cpr'),
    rmdir = require('rmdir-recursive'),
    config,
    instance;

var defaults = {
    specDir: path.join(process.cwd(), 'spec/'),
    resultsDir: path.join(process.cwd(), 'results/'),
    parallelLimit: 18,
    live: false
};

var cli = meow({
    help: [
        'Usage',
        '  pediff [options] run all',
        '  pediff [options] run <spec>[ <spec2> <spec...> ]',
        '',
        'Options',
        '  --config <path> - tells pediff where to look for a configuration file (by default it\'s pediff.js in root directory)',
        '  --report        - generate a static report, viewable without running an http server',
        //'  --live          - runs a webserver for dynamic testing',
        '  --debug         - outputs additional information'
    ]
});

if(!cli.input.length && !cli.flags.live || cli.input[0] !== 'run' || !cli.input[1]) {
    cli.showHelp();
    process.exit(0);
}

try {
    if(cli.flags.config) {
        config = require(path.join(process.cwd(), cli.flags.config));
    } else {
        config = require(path.join(process.cwd(), 'pediff.js'));
    }
} catch (e) {
    if(cli.flags.config) {
        console.error('  Configuration file ' + cli.flags.config + ' not found.');
    } else {
        console.error('  Configuration file pediff.js not found.\n  Please create this file in the root directory, or tell us where to find it with the --config option.');
    }
    process.exit(0);
}

config = parseConfig(config, defaults);

config.debug = !!cli.flags.debug;

if(cli.flags.report) {
    config.reportDir = config.resultsDir;
    config.resultsDir = path.join(config.resultsDir, 'results/');

    rmdir.sync(config.reportDir);
}

instance = new Pediff(config);

if(cli.flags.live) {
    new Server(config, instance);
} else {
    if(cli.input[1] === 'all') {
        instance.runAll();
    } else {
        var specs = cli.input.splice(1, cli.input.length - 1);
        instance.runBundle(specs);
    }

    if(cli.flags.report) {
        Proxy.once('bundle:finished', function(data) {
            var report = JSON.stringify(data.results),
                script = '<script type="text/javascript">window.report='+report+'</script>';

            cpr(__dirname + '/public/', config.reportDir, {
                deleteFirst: false,
                overwrite: false,
                confirm: true
            }, function(err) {
                if(err) {
                    throw new Error(err);
                } else {
                    var src = path.join(config.reportDir, 'index.html');
                    var file = fs.readFileSync(src, {
                        encoding: 'utf-8'
                    });

                    file = file.replace('</main>', '</main>' + script);

                    fs.writeFileSync(src, file, {
                        encoding: 'utf-8'
                    });
                }
            });
        });
    }
}
