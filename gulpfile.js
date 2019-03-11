const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
 
gulp.task('default', () => {
  return gulp.src('lib/frontend/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({ presets: ['@babel/env'] }))
    .pipe(concat('client.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public'))
});