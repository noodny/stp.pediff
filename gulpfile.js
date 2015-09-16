var browserSync = require('browser-sync'),
    gulp = require('gulp'),
    plugins = require('gulp-load-plugins')();


function handleError(err) {
    console.log(err.toString());
    this.emit('end');
}

gulp.task('sync', function() {
    browserSync.init({
        server: {
            baseDir: "./public/"
        }
    });
});

gulp.task('sass', function() {
    gulp.src('./public/css/scss/**/*.scss')
        .pipe(plugins.plumber({
            errorHandler: handleError
        }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass({
            outputStyle: 'compressed'
        }))
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest('./public/css'))
        .pipe(browserSync.stream());
});

gulp.task('scripts', function() {
    return gulp.src('./public/js/almond.js')
        .pipe(plugins.requirejsOptimize({
            enforceDefine: true,
            name: 'almond',
            include: ['globals', 'bootstrap'],
            insertRequire: ['bootstrap'],
            mainConfigFile: './public/js/bootstrap.js',
            optimize: 'none',
            paths: {
                'text': 'vendor/requirejs/text',
                'templates': '../templates',
                'jquery': 'empty:',
                'lodash': 'empty:',
                'backbone': 'empty:',
                'materialize': 'vendor/materialize.amd'
            },
            out: "bootstrap.min.js"
        }))
        .pipe(gulp.dest('public/js'));
});

gulp.task('watch', function() {
    gulp.watch('./public/css/scss/**/*.scss', ['sass']);
    gulp.watch([
        './public/index.html',
        './public/templates/**/*.html',
        './public/js/**/*.js'
    ]).on('change', browserSync.reload);
});

gulp.task('build', [,
    'sass'
]);

gulp.task('default', plugins.sequence('watch', 'sync'));
