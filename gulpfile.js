'use strict';

var gulp            = require('gulp');
var gulpSequence    = require('gulp-sequence');
var gulpif          = require('gulp-if');
var rename          = require('gulp-rename');
var argv            = require('yargs').argv;
var sourcemaps      = require('gulp-sourcemaps');
var browserSync     = require('browser-sync').create();
var del             = require('del');

var browserify      = require('browserify');
var watchify        = require('watchify');
var source          = require('vinyl-source-stream');
var buffer           = require('vinyl-buffer');
var debowerify      = require('debowerify');
var eslint          = require('gulp-eslint');
var uglify          = require('gulp-uglify');

var sass            = require('gulp-sass');
var autoprefixer    = require('gulp-autoprefixer');

var imagemin        = require('gulp-imagemin');

var iconfont        = require('gulp-iconfont');
var consolidate     = require('gulp-consolidate');


var runTimestamp    = Math.round(Date.now()/1000);

var onError = function(err) {
  console.log(err.message);
  this.emit('end');
};


// clean build folder
gulp.task('del', function() {
  return del(['build/**/*']);
});


// bundling JS with browserify and watchify
var b = watchify(browserify('src/js/main', {
  cache: {},
  packageCache: {},
  fullPaths: false
})).transform(debowerify);

gulp.task('js', bundle);
b.on('update', bundle);

function bundle() {
  return b.bundle()
    .on('error', onError)
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(gulpif(argv.prod, uglify()))
    .pipe(gulp.dest('build/js'))
    .pipe(browserSync.stream());
}

gulp.task('eslint', function () {
  return gulp.src('src/js/**/*.js')
    .pipe(eslint({
      globals: {
        'jQuery':false,
        '$':true
      },
      env: {
        "commonjs": true,
        "browser": true
      }
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});



// sass
gulp.task('sass', function() {
  return gulp.src('src/scss/*.scss')
    .pipe(sourcemaps.init())
    .pipe(gulpif(argv.prod,
      sass(),
      sass({outputStyle: 'compressed'})
    ))
    .on('error', onError)
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build/css'))
    .pipe(browserSync.stream({match: '**/*.css'}));
});


// Images
gulp.task('imagemin', function () {
  return gulp.src('src/assets/images/**/*')
    .pipe(imagemin({
      progressive: true
    }))
    .on('error', onError)
    .pipe(gulp.dest('build/assets/images'))
    .pipe(browserSync.stream());
});


// icon-fonts
gulp.task('iconfont', function(){
  return gulp.src('src/assets/icons/*.svg')
    .pipe(iconfont({
      fontName: 'icons',
      prependUnicode: true,
      formats: ['eot', 'woff', 'ttf'],
      centerHorizontally: true,
      normalize: true,
      timestamp: runTimestamp
    }))
    .on('glyphs', function(glyphs) {
      gulp.src('src/scss/templates/_icons.scss')
        .pipe(consolidate('lodash', {
          glyphs: glyphs,
          fontName: 'icons',
          fontPath: '../assets/fonts/',
          className: 'icon'
        }))
        .pipe(gulp.dest('src/scss/'));
    })
    .on('error', onError)
    .pipe(gulp.dest('build/assets/fonts/'))
    .pipe(browserSync.stream());
});


// copy
gulp.task('copy', function(){
  gulp.src('src/*.html')
      .pipe(gulp.dest('build'));
});


gulp.task('serve', function() {
  browserSync.init(null, {
    server: {
      baseDir: "./build/",
      index: "index.html"
    },
    port: 4000,
    ui: {
      port: 4001
    },
    open: false,
    notify: true,
    reloadOnRestart: true,
    ghostMode: {
      clicks: true,
      forms: true,
      scroll: false
    }
  }, function callback() {
    gulp.watch('src/scss/**/*.scss',          ['sass']);
    gulp.watch('src/assets/images/**/*',      ['imagemin']);
    gulp.watch('src/assets/icons/**/*.svg',   ['iconfont']);
    gulp.watch(['src/*.html'],                ['copy']).on("change", browserSync.reload);
  });
});


// GULP build task
gulp.task('build', gulpSequence(
  'del',
  'imagemin',
  'iconfont',
  ['sass', 'js', 'copy']
));

// GULP work task
gulp.task('default', gulpSequence(
  'build',
  'serve'
));