'use strict';

const gulp = require('gulp');
const stylus = require('gulp-stylus');
const debug = require('gulp-debug');
const sourcemaps = require('gulp-sourcemaps');
const gulpIf = require('gulp-if');
const del = require('del');
const newer = require('gulp-newer');
const browserSync = require('browser-sync').create();
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const svgSprite = require('gulp-svg-sprite');
const cssnano = require('gulp-cssnano');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';


gulp.task('styles', function() {
	return gulp.src('frontend/styles/main.styl')
		.pipe(plumber({errorHandler: notify.onError(function(err) {
			return {
				title: 'Styles',
				message: err.message
			};
		})}))
		.pipe(gulpIf(isDevelopment, sourcemaps.init()))
		.pipe(stylus({
			import: process.cwd() + '/tmp/styles/variables--svg-sprite'
		}))
		.pipe(gulpIf(isDevelopment, sourcemaps.write()))
		.pipe(gulpIf(!isDevelopment, cssnano()))
		.pipe(gulpIf(!isDevelopment, rev()))
		.pipe(gulp.dest('public'))
		.pipe(gulpIf(!isDevelopment, rev.manifest('css.json')))
		.pipe(gulpIf(!isDevelopment, gulp.dest('manifest')));
});

gulp.task('svg', function() {
	return gulp.src('frontend/assets/img/sprite-svg/*.svg')
		.pipe(svgSprite({
			mode: {
				css: {
					dest: '.',
					bust: !isDevelopment,
					sprite: 'img/svg-sprite.svg',
					layout: 'vertical',
					prefix: 'svg-%s()',
					dimensions: true,
					render: {
						styl: {
							dest: 'variables--svg-sprite.styl'
						}
					}
				}
			}
		}))
		.pipe(gulpIf('*.styl', gulp.dest('tmp/styles'), gulp.dest('public')));
		// sprite грязновато, должно быть в dest public/img, а пути в var--svg-sprt.styl пусть меняет gilp-rev(-replase?)
		// использование картинки в спрайте я сделал через миксин (вместо екстенда), но эти миксины используют общую переменную ($svg-common) через екстенд. Хз как убрать эти екстенды. См файл tmp/styles/var--svg-sprt.styl
});

gulp.task('assets', function() {
	return gulp.src(['frontend/assets/**/*.*', '!frontend/assets/img/sprite-svg/*.svg'], {since: gulp.lastRun('assets')})
		.pipe(newer('public'))
		.pipe(gulpIf(!isDevelopment, revReplace({
			manifest: gulp.src('manifest/css.json', {allowEmpty: true})
		})))
		.pipe(gulp.dest('public'))
});

gulp.task('clean', function() {
	return del(['public', 'tmp', 'manifest']);
});

gulp.task('build', gulp.series(
	'clean',
	'svg',
	gulp.parallel('styles', 'assets'))
//дабы повысить произ-ть можно делать clean только для прода. Кажется все ок, если не делать его для разработки. Не знаю как реализовать, оставляю на потом.
);

gulp.task('watch', function() {
	gulp.watch(['frontend/styles/**/*.styl', 'tmp/styles/*.styl'], gulp.series('styles'));
	gulp.watch(['frontend/assets/**/*.*', '!frontend/assets/img/sprite-svg/*.svg'], gulp.series('assets'));
	gulp.watch('frontend/assets/img/sprite-svg/*.svg', gulp.series('svg'))
});

gulp.task('serve', function() {
	browserSync.init({
		server: 'public'
	});
	browserSync.watch('public/**/*.*').on('change', browserSync.reload);
});

gulp.task('dev', 
	gulp.series('build', gulp.parallel('watch', 'serve'))
);
