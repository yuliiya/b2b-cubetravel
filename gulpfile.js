const {
  src, dest, series, watch, parallel,
} = require('gulp');

const plumber = require('gulp-plumber');
const del = require('del');
const fileInclude = require('gulp-file-include');
const replace = require('gulp-replace');
const sass = require('gulp-sass');
const mediaQueriesGroup = require('gulp-group-css-media-queries');
const csso = require('gulp-csso');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const svgSprite = require('gulp-svgstore');
const imagemin = require('gulp-imagemin');
const fs = require('fs');
const gulpIf = require('gulp-if');
const pngSprite = require('gulp.spritesmith');
const pngSprite3x = require('gulp.spritesmith.3x');
const stylelint = require('gulp-stylelint');
const eslint = require('gulp-eslint');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const ttf2eot = require('gulp-ttf2eot');
const postcss = require('gulp-postcss');
const browserSync = require('browser-sync').create();
const psi = require('psi');
const ngrok = require('ngrok');
const path = require('path');
const tap = require('gulp-tap');
const autoprefixer = require('autoprefixer');
const htmlreplace = require('gulp-html-replace');
const concat = require('gulp-concat');
const babel = require('gulp-babel');
const flexbugs = require('postcss-flexbugs-fixes');

let buildUrl = '';
const urls = [];

const srcRoot = './src';
const devRoot = './dev';
const buildRoot = './build';
const libraryRoot = './library';

const srcPath = {
  assets: {
    root: `${srcRoot}/assets`,
    img: {
      root: `${srcRoot}/assets/img`,
      sprite: {
        root: `${srcRoot}/assets/img/sprite`,
        svg: `${srcRoot}/assets/img/sprite/svg`,
        png: `${srcRoot}/assets/img/sprite/png`,
      },
    },
  },
  components: {
    root: `${srcRoot}/components`,
    features: `${srcRoot}/components/features`,
    shared: `${srcRoot}/components/shared`,
  },
  fonts: `${srcRoot}/fonts`,
  js: {
    root: `${srcRoot}/js`,
    vendors: `${srcRoot}/js/vendors`,
    uiKit: `${srcRoot}/js/ui-kit`,
  },
  pages: {
    root: `${srcRoot}/pages`,
    include: `${srcRoot}/pages/include`,
    library: `${srcRoot}/pages/library`,
  },
  styles: {
    root: `${srcRoot}/styles`,
    common: `${srcRoot}/styles/common`,
    dependencies: {
      root: `${srcRoot}/styles/dependencies`,
      mixins: `${srcRoot}/styles/dependencies/mixins`,
    },
    vendors: `${srcRoot}/styles/vendors`,
    uiKit: `${srcRoot}/styles/ui-kit`,
  },
};

const devPath = {
  assets: {
    root: `${devRoot}/assets`,
    img: `${devRoot}/assets/img`,
  },
  fonts: `${devRoot}/fonts`,
  js: `${devRoot}/js`,
  pages: `${devRoot}`,
  styles: `${devRoot}/styles`,
};

const buildPath = {
  assets: {
    root: `${buildRoot}/assets`,
    img: `${buildRoot}/assets/img`,
  },
  fonts: `${buildRoot}/fonts`,
  js: `${buildRoot}/js`,
  pages: `${buildRoot}`,
  styles: `${buildRoot}/styles`,
};

const libraryPath = {
  pages: `${libraryRoot}`,
  js: `${libraryRoot}/js`,
  styles: `${libraryRoot}/styles`,
};

/**
 * Servers
 * --------------------------------------------------------------------------
 */

/**
 * Browser Sync:
 * 1. ?????????????????????????? dev-??????????????
 * 2. ?????????????????????????? build-??????????????
 * 3. ?????????????????????????? ngrok
 * 4. Live reload
 */

function initDevServer(done) {
  browserSync.init({
    server: devRoot,
    port: 8080,
    browser: 'chrome',
  }, (err, bs) => ngrok.connect(bs.options.get('port')).then((url) => {
    console.log('Tunnel Dev:', url);
    done();
  }));
}

function initLibServer(done) {
  browserSync.init({
    server: libraryRoot,
    port: 8080,
    browser: 'chrome',
  });
  done();
}

function initBuildServer(done) {
  browserSync.init({
    server: buildRoot,
    port: 5000,
    browser: 'chrome',
  }, (err, bs) => ngrok.connect(bs.options.get('port')).then((url) => {
    console.log('Tunnel Build:', url);
    buildUrl = url;
    done();
  }));
}

function liveReload(done) {
  browserSync.reload();
  done();
}

/**
 * Cleaning
 * --------------------------------------------------------------------------
 */

/**
 * ?????????????? ????????????????????:
 * 1. ?????????????? ./dev
 * 2. ?????????????? ./build
 * 3. ?????????????? ./library
 */

function cleanDev() {
  return del(`${devRoot}`);
}

function cleanBuild() {
  return del(`${buildRoot}`);
}

function cleanLib() {
  return del(`${libraryRoot}`);
}

/**
 * Html
 * --------------------------------------------------------------------------
 */

/**
 * ???????????? html:
 * 1. ???????????? ???????? ???????????????? ???? ./src/components/, ./src/pages/ ?? ?????????? .html
 * 2. ?????????????? ???? ???????????? ?????????????????????? ?? ?????????????????? ??????????
 * 3. ???????????????????? ???????????????? ???????????? .html ?? ./dev/
 */

function compileHtml() {
  const buildRegEx = /(\/<\/!\/-\/-)(?!\s*build\/:|\*|\s*endbuild\s)[^>]*(\S*\/-\/-\/>)/gi;
  const emptySpacesRegEx = /$(\n)(\s|\n|\t)+^/gm;
  let svgSpriteExists;

  if (fs.existsSync(`${srcPath.assets.img.sprite.root}/sprite.svg`)) {
    svgSpriteExists = true;
  } else {
    svgSpriteExists = false;
  }

  return src(`${srcPath.pages.root}/*.html`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      context: {
        svgSpriteExists,
      },
      indent: true,
    }))
    .pipe(replace(buildRegEx, ''))
    .pipe(replace(emptySpacesRegEx, '$1'))
    .pipe(dest(`${devPath.pages}`));
}

/**
 * ???????????? html ?????? components-library:
 * 1. ???????????? ???????? ???????????????? ?? ?????????? .html
 * 2. ???????????????????? ???????????????? ???????????? .html ?? ./library/
 */

function compileHtmlLib() {
  return src(`${srcPath.pages.library}/*.html`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      indent: true,
    }))
    .pipe(dest(`${libraryPath.pages}`));
}

/**
 * ?????????????? ???????????????????? ./dev/ ???? ???????? ???????????? .html
 */

function cleanHtml() {
  return del(`${devPath.pages}/*.html`);
}

/**
 * ???????????????????????? ?????????????????? html:
 * 1. ???????????????????????? ???????????????????? ./src/pages/ ???? ?????? ?????????????? (add, del, change)
 * 2. ???????????????????????? ???????????? .html ?? ./src/components/ ?? ./src/pages/include/ ???? ?????????????????? (change)
 */

function watchHtml() {
  const tasks = series(cleanHtml, compileHtml, liveReload);

  watch(`${srcPath.pages.root}/*.html`, tasks);
  watch([
    `${srcPath.pages.include}/*.html`,
    `${srcPath.components.root}/**/*.html`,
  ], { events: 'change' }, tasks);
  watch(`${srcPath.assets.img.sprite.root}/sprite.svg`, tasks);
}

/**
 * ???????????????????????? ?????????????????? html ?????? components-library:
 * 1. ???????????????????????? ???????? ???????????? .html ???? ?????????????????? (change)
 */

function watchHtmlLib() {
  watch([
    `${srcPath.pages.library}/*.html`,
    `${srcPath.components.root}/**/*.html`,
  ], { events: 'change' }, series(compileHtmlLib, liveReload));
}

/**
 * ?????????????????? ???????????? html:
 * 1. ???????????? ???????????????????????? ???????????? .css ?? .js ???? ????????????????????????????????
 * 2. ?????????????? ???????????? .html ?? ./build/
 */
function buildHtml() {
  return src(`${devPath.pages}/*.html`)
    .pipe(htmlreplace({
      css: 'styles/style.min.css',
      js: {
        src: null,
        tpl: '<script src="js/script.min.js" async></script>',
      },
    }))
    .pipe(dest(`${buildPath.pages}`));
}

/**
 * Style
 * --------------------------------------------------------------------------
 */

/**
 * ???????????? ?? ???????????????????? scss:
 * 1. ???????????? ???????????? .scss (.css) ???? ./src/styles/ ?? style.scss
 * 2. ???????????? ???????????? .scss (.css) ???? ./src/styles/vendors/ ?? vendors.scss
 * 3. ???????????? ???????????? .scss (.css) ???? ./src/styles/ui-kit/ ?? ui-kit.scss
 * 4. ???????????? ???????????? .scss ???? ./src/styles/components/ ?? components.scss
 * 5. ???????????????????? .scss ?? .css
 * 6. Post CSS ??????????????????????????: ??????????????????????????, ??????????-??????????????????
 * 7. ???????????????????? ?????????? ?? ./dev/styles/
 */

const stylelintOptions = {
  fix: true,
  reporters: [
    {
      formatter: 'string',
      console: true,
    },
  ],
};

function compileCssGeneral() {
  return src(`${srcPath.styles.root}/style.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(stylelint(stylelintOptions))
    .pipe(dest(`${devPath.styles}`));
}

function compileCssVendors() {
  return src(`${srcPath.styles.root}/vendors.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(dest(`${devPath.styles}`));
}

function compileCssComponents() {
  return src(`${srcPath.styles.root}/components.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(stylelint(stylelintOptions))
    .pipe(dest(`${devPath.styles}`));
}

function compileCssUiKit() {
  return src(`${srcPath.styles.root}/ui-kit.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(stylelint(stylelintOptions))
    .pipe(dest(`${devPath.styles}`));
}
/**
 * ???????????? ?? ???????????????????? scss ?????? components-library:
 * 1. ???????????? ???????????? .scss (.css) ???? ./src/styles/ ?? style.scss
 * 2. ???????????? ???????????? .scss (.css) ???? ./src/styles/vendors/ ?? vendors.scss
 * 3. ???????????? ???????????? .scss ???? ./src/styles/components/ ?? components.scss
 * 4. ???????????????????? .scss ?? .css
 * 5. Post CSS ??????????????????????????: ??????????????????????????, ??????????-??????????????????
 * 6. ???????????????????? ?????????? ?? ./library/styles/
 */

function compileCssGeneralLib() {
  return src(`${srcPath.styles.root}/style.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(dest(`${libraryPath.styles}`));
}

function compileCssVendorsLib() {
  return src(`${srcPath.styles.root}/vendors.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(dest(`${libraryPath.styles}`));
}

function compileCssComponentsLib() {
  return src(`${srcPath.styles.root}/components.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(dest(`${libraryPath.styles}`));
}

function compileCssUiKitLib() {
  return src(`${srcPath.styles.root}/ui-kit.scss`)
    .pipe(plumber())
    .pipe(sass())
    .pipe(mediaQueriesGroup())
    .pipe(
      postcss([
        autoprefixer(),
        flexbugs(),
      ]),
    )
    .pipe(dest(`${libraryPath.styles}`));
}

/**
 * ???????????????????????? ?????????????????? style
 * 1. ???????????????????????? ???????? .scss (.css) ???????????? ?? ./src/styles/** (?????????? ./src/styles/vendors,
 * vendors.scss ?? components.scss) ???? ?????????????????? (change)
 * 2. ???????????????????????? .scss ???????????? ?? ./src/styles/vendors/ ?? vendors.scss ???? ?????????????????? (change)
 * 3. ???????????????????????? .scss ???????????? ?? ./src/styles/ui-kit/ ?? ui-kit.scss ???? ?????????????????? (change)
 * 4. ???????????????????????? .scss ???????????? ?? ./src/components/** ?? components.scss ???? ?????????????????? (change)
 */

function watchCss() {
  watch([
    `${srcPath.styles.root}/**/*.scss`,
    `!${srcPath.styles.dependencies.root}/**/*`,
    `!${srcPath.styles.vendors}/*`,
    `!${srcPath.styles.uiKit}/*`,
    `!${srcPath.styles.root}/vendors.scss`,
    `!${srcPath.styles.root}/components.scss`,
    `!${srcPath.styles.root}/ui-kit.scss`,
  ], { events: 'change' }, series(compileCssGeneral, liveReload));
  watch([
    `${srcPath.styles.vendors}/*`,
    `${srcPath.styles.root}/vendors.scss`,
  ], { events: 'change' }, series(compileCssVendors, liveReload));
  watch([
    `${srcPath.styles.root}/components.scss`,
    `${srcPath.components.root}/**/*.scss`,
  ], { events: 'change' }, series(compileCssComponents, liveReload));
  watch([
    `${srcPath.styles.uiKit}/*`,
    `${srcPath.styles.root}/ui-kit.scss`,
  ], { events: 'change' }, series(compileCssUiKit, liveReload));
  watch(`${srcPath.styles.dependencies.root}/**/*.scss`, { events: 'change' }, series(compileCssGeneral, compileCssUiKit, compileCssComponents, liveReload));
}

/**
 * ???????????????????????? ?????????????????? style ?????? components-library
 * 1. ???????????????????????? ???????? .scss (.css) ???????????? ???? ?????????????????? (change)
 */

function watchCssLib() {
  watch([
    `${srcPath.styles.root}/**/*.scss`,
    `${srcPath.components.root}/**/*.scss`,
  ], { events: 'change' }, series(parallel(compileCssGeneralLib, compileCssVendorsLib, compileCssUiKitLib, compileCssComponentsLib), liveReload));
}

/**
 * ?????????????????? ???????????? css:
 * 1. ???????????? ???????? .css ???????????? ?? style.js
 * 2. ???????????????????? ?????????? style.js ?? ./build/styles/
 * 3. ?????????????????????? ?? ???????????????????? ?????????? style.min.js ?? ./build/styles/
 */

function buildCss() {
  return src([
    `${devPath.styles}/style.css`,
    `${devPath.styles}/vendors.css`,
    `${devPath.styles}/ui-kit.css`,
    `${devPath.styles}/components.css`,
  ])
    .pipe(plumber())
    .pipe(concat('style.css'))
    .pipe(dest(`${buildPath.styles}`))
    .pipe(csso())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(`${buildPath.styles}`));
}

/**
 * JavaScript
 * --------------------------------------------------------------------------
 */

/**
 * ???????????? js:
 * 1. ???????????? ???????? ???????????? .js ???? ./src/js/vendors/ ?? vendors.js
 * 2. ???????????? ???????? ???????????? .js ???? ./src/components/ ?? components.js
 * 3. ???????????? ???????? ???????????? .js ???? ./src/js/ui-kit/ ?? ui-kit.js
 * 4. ???????????????????? ???????????????? ???????????? .js ?? ./dev/js/
 * 5. ?????????????? common.js ?? ./dev/js/
 */

function compileJsVendors() {
  return src(`${srcPath.js.root}/vendors.js`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      indent: true,
    }))
    .pipe(dest(`${devPath.js}`));
}

function compileJsComponents() {
  return src(`${srcPath.js.root}/components.js`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      indent: true,
    }))
    .pipe(eslint({configFile: 'eslint.json'}))
    .pipe(dest(`${devPath.js}`));
}

function compileJsUiKit() {
  return src(`${srcPath.js.root}/ui-kit.js`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      indent: true,
    }))
    .pipe(eslint({configFile: 'eslint.json'}))
    .pipe(dest(`${devPath.js}`));
}

function compileJsCommon() {
  return src(`${srcPath.js.root}/common.js`)
    .pipe(plumber())
    .pipe(eslint({configFile: 'eslint.json'}))
    .pipe(dest(`${devPath.js}`));
}

/**
 * ???????????? js ?????? components-library::
 * 1. ???????????? ???????? ???????????? .js ???? ./src/js/vendors/ ?? vendors.js
 * 2. ???????????? ???????? ???????????? .js ???? ./src/components/ ?? components.js
 * 3. ???????????? ???????? ???????????? .js ???? ./src/js/ui-kit/ ?? ui-kit.js
 * 4. ???????????????????? ???????????????? ???????????? .js ?? ./library/js/
 * 5. ?????????????? common.js ?? ./library/js/
 */

function compileJsVendorsLib() {
  return src(`${srcPath.js.root}/vendors.js`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      indent: true,
    }))
    .pipe(dest(`${libraryPath.js}`));
}

function compileJsComponentsLib() {
  return src(`${srcPath.js.root}/components.js`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      indent: true,
    }))
    .pipe(eslint())
    .pipe(dest(`${libraryPath.js}`));
}

function compileJsUiKitLib() {
  return src(`${srcPath.js.root}/ui-kit.js`)
    .pipe(plumber())
    .pipe(fileInclude({
      prefix: '@',
      basepath: `${srcRoot}`,
      indent: true,
    }))
    .pipe(eslint())
    .pipe(dest(`${libraryPath.js}`));
}

function compileJsCommonLib() {
  return src(`${srcPath.js.root}/common.js`)
    .pipe(plumber())
    .pipe(eslint())
    .pipe(dest(`${libraryPath.js}`));
}

/**
 * ???????????????????????? ?????????????????? js:
 * 1. ???????????????????????? ???????????? .js ?? ./src/js/vendors/ ???? ?????????????????? (change)
 * 2. ???????????????????????? ???????????? .js ?? ./src/components/ ???? ?????????????????? (change)
 * 3. ???????????????????????? ?????????? common.js ???? ?????????????????? (change)
 */

function watchJs() {
  watch([
    `${srcPath.js.root}/vendors.js`,
    `${srcPath.js.vendors}/*.js`,
  ], { events: 'change' }, series(compileJsVendors, liveReload));
  watch([
    `${srcPath.js.root}/components.js`,
    `${srcPath.components.root}/**/*.js`,
  ], { events: 'change' }, series(compileJsComponents, liveReload));
  watch([
    `${srcPath.js.root}/ui-kit.js`,
    `${srcPath.js.uiKit}/**/*.js`,
  ], { events: 'change' }, series(compileJsUiKit, liveReload));
  watch(`${srcPath.js.root}/common.js`, { events: 'change' }, series(compileJsCommon, liveReload));
}

/**
 * ???????????????????????? ?????????????????? js ?????? components-library
 * 1. ???????????????????????? ???????? .js ???????????? ???? ?????????????????? (change)
 */

function watchJsLib() {
  watch([
    `${srcPath.js.root}/**/*.js`,
    `${srcPath.components.root}/**/*.js`,
  ], { events: 'change' }, series(parallel(compileJsVendorsLib, compileJsComponentsLib, compileJsUiKitLib, compileJsCommonLib), liveReload));
}

/**
 * ?????????????????? ???????????? js:
 * 1. ???????????? ???????? .js ???????????? ?? script.js
 * 2. ???????????????????? ?????????? script.js ?? ./build/js/
 * 3. ?????????????????????? ?? ???????????????????? ?????????? script.min.js ?? ./build/js/
 */

function buildJs() {
  return src([
    `${devPath.js}/vendors.js`,
    `${devPath.js}/common.js`,
    `${devPath.js}/ui-kit.js`,
    `${devPath.js}/components.js`,
  ])
    .pipe(plumber())
    .pipe(babel({
      presets: ['@babel/env'],
      plugins: [
        ["@babel/plugin-proposal-object-rest-spread", { "loose": true, "useBuiltIns": true }]
      ]
    }))
    .pipe(concat('script.js'))
    .pipe(dest(`${buildPath.js}`))
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(`${buildPath.js}`));
}

/**
 * Sprites
 * --------------------------------------------------------------------------
 */

/**
 * ???????????????? svg-??????????????
 * 1. ???????? ???????? ???????????? .svg ???? ./src/assets/img/sprite/svg/ ?? ????????????
 * 2. ?????????????????????? ???????????????????? svg-??????????????
 * 3. ???????????????????? sprite.svg ?? ./src/assets/img/sprite/
 */

function compileSvgSprite() {
  return src(`${srcPath.assets.img.sprite.svg}/*.svg`)
    .pipe(plumber())
    .pipe(svgSprite({ inlineSvg: true }))
    .pipe(imagemin([
      imagemin.svgo({
        plugins: [
          { removeViewBox: true },
          { cleanupIDs: false },
        ],
      }),
    ]))
    .pipe(rename({ basename: 'sprite' }))
    .pipe(dest(`${srcPath.assets.img.sprite.root}`));
}

/**
 * ???????????????????????? ?????????????????? svg:
 * 1. ???????????????????????? ???????????? svg ?? ./src/assets/img/sprite/svg/ ???? ?????? ?????????????? (add, del, change)
 */

function watchSvgSprite() {
  watch(`${srcPath.assets.img.sprite.svg}/*.svg`, series(compileSvgSprite, liveReload));
}

/**
 * ???????????????? png-??????????????
 * 1. ???????? ???????? ???????????? .png, @2x.png, @3x.png ???? ./src/assets/img/sprite/png/ ?? ????????????
 * 2. ???????????????????? sprite.png, sprite@2x.png, sprite@3x.png ?? ./src/assets/img/sprite/
 * 3. ???????????????????? sprite.scss ?? ./src/style/dependencies/mixins/
 */

function compilePngSprite() {
  const spriteCssPath = '../assets/img/sprite/sprite';
  let plugin = pngSprite;
  let spriteSrc = `${srcPath.assets.img.sprite.png}/*.png`;
  let imgs = 0;
  let imgs2x = 0;
  let imgs3x = 0;

  const options = {
    imgName: 'sprite.png',
    imgPath: `${spriteCssPath}.png`,
    cssName: '_sprites.scss',
    padding: 20,
  };
  const options2x = {
    retinaImgName: 'sprite@2x.png',
    retinaImgPath: `${spriteCssPath}@2x.png`,
    retinaSrcFilter: `${srcPath.assets.img.sprite.png}/*@2x.png`,
  };
  const options3x = {
    retina3xImgName: 'sprite@3x.png',
    retina3xImgPath: `${spriteCssPath}@3x.png`,
    retina3xSrcFilter: `${srcPath.assets.img.sprite.png}/*@3x.png`,
  };

  fs.readdirSync(`${srcPath.assets.img.sprite.png}`).forEach((file) => {
    if ((/^[^@]+\.png$/i).test(file)) {
      imgs++;
    }
    if ((/@2x\.png$/i).test(file)) {
      imgs2x++;
    }
    if ((/@3x\.png$/i).test(file)) {
      imgs3x++;
    }
  });

  if (imgs === imgs2x && imgs === imgs3x) {
    plugin = pngSprite3x;
    Object.assign(options, options2x, options3x);
  } else if (imgs === imgs2x) {
    spriteSrc = [
      `${srcPath.assets.img.sprite.png}/*.png`,
      `!${srcPath.assets.img.sprite.png}/*@3x.png`,
    ];
    Object.assign(options, options2x);
  } else {
    spriteSrc = [
      `${srcPath.assets.img.sprite.png}/*.png`,
      `!${srcPath.assets.img.sprite.png}/*@2x.png`,
      `!${srcPath.assets.img.sprite.png}/*@3x.png`,
    ];
  }

  return src(spriteSrc)
    .pipe(plumber())
    .pipe(plugin(options))
    .pipe(gulpIf('*.png', dest(`${srcPath.assets.img.sprite.root}`)))
    .pipe(gulpIf('*.scss', dest(`${srcPath.styles.dependencies.mixins}`)));
}

/**
 * ???????????????????????? ?????????????????? png:
 * 1. ???????????????????????? ???????????? .png ?? ./src/assets/img/sprite/png/ ???? ?????? ?????????????? (add, del, change)
 */

function watchPngSprite() {
  watch(`${srcPath.assets.img.sprite.png}`, series(compilePngSprite, liveReload));
}

/**
 * Asset
 * --------------------------------------------------------------------------
 */

/**
 * ?????????????? ????????????:
 * 1. ?????????????? ???????? ???????????? ???? ./src/assets/
 * (?????????? ./src/assets/sprite.png ?? ./src/assets/sprite.svg) ?? ./dev/assets/
 */

function exportAssetsDev() {
  return src([
    `${srcPath.assets.root}/**/*.*`,
    `!${srcPath.assets.img.sprite.png}`,
    `!${srcPath.assets.img.sprite.png}/**/*`,
    `!${srcPath.assets.img.sprite.svg}`,
    `!${srcPath.assets.img.sprite.svg}/**/*`,
  ])
    .pipe(dest(`${devPath.assets.root}`));
}

/**
 * ?????????????? ???????????????????? ./dev/assets/ ???? ???????? ????????????
 */

function cleanAsset() {
  return del(`${devPath.assets.root}`);
}

/**
 * ???????????????????????? ?????????????????? assets:
 * 1. ???????????????????????? ???????? ???????????? ???? ./src/assets/
 * (?????????? ./src/assets/sprite.png ?? ./src/assets/sprite.svg) ???? ?????? ?????????????? (add, del, change)
 */

function watchAssets() {
  watch([
    `${srcPath.assets.root}/**/*.*`,
    `!${srcPath.assets.img.sprite.png}`,
    `!${srcPath.assets.img.sprite.png}/**/*`,
    `!${srcPath.assets.img.sprite.svg}`,
    `!${srcPath.assets.img.sprite.svg}/**/*`,
  ], series(cleanAsset, exportAssetsDev, liveReload));
}

/**
 * Fonts
 * --------------------------------------------------------------------------
 */

/**
 * ?????????????????? ??????-??????????????:
 * 1. ???? ???????????? .ttf ?? ./src/fonts/ ???????????????????????? ?????????? .woff, .woff2, .eot
 * 2. ???????????????????? ?????????????????????????????? ?????????????? ?? ./dev/fonts/
 */

function convertTTFToWOFF() {
  return src([`${srcPath.fonts}/*.ttf`])
    .pipe(ttf2woff())
    .pipe(dest([`${devPath.fonts}`]));
}

function convertTTFToWOFF2() {
  return src([`${srcPath.fonts}/*.ttf`])
    .pipe(ttf2woff2())
    .pipe(dest([`${devPath.fonts}`]));
}

function convertTTFToEOT() {
  return src([`${srcPath.fonts}/*.ttf`])
    .pipe(ttf2eot())
    .pipe(dest([`${devPath.fonts}`]));
}

/**
 * ?????????????? ???????????????????? ./dev/fonts/ ???? ???????? ????????????
 */

function cleanFonts() {
  return del(`${devPath.fonts}`);
}

/**
 * ???????????????????????? ?????????????????? fonts:
 * 1. ???????????????????????? ???????????? .ttf ?? ./src/fonts/ ???? ?????? ?????????????? (add, del, change)
 */

function watchFonts() {
  watch(`${srcPath.fonts}/*.ttf`, series(fontGeneration, liveReload));
}

const fontGeneration = series(
  cleanFonts,
  parallel(convertTTFToWOFF, convertTTFToWOFF2, convertTTFToEOT),
);

/**
 * ?????????????????? ???????????? fonts:
 * 1. ?????????????? ???????? .woff, .woff2, .eot  ./build/fonts/
 */

function buildFonts() {
  return src(`${devPath.fonts}/*.*`)
    .pipe(dest(`${buildPath.fonts}`));
}

/**
 * Optimization reports
 * --------------------------------------------------------------------------
 */

/**
 * Psi:
 * 1. ?????????????????? ???????? url html-?????????????? ?? ./build/
 * 2. ?????????? ?????????????????????? ????????????
 * 3. ?????????? ???????????????????? ????????????
 */

function getAllBuildUrls() {
  return src(`${buildRoot}/*.html`)
    .pipe(
      tap((file) => {
        const filename = path.basename(file.path);
        const url = `${buildUrl}/${filename}`;

        urls.push(url);
      }),
    );
}

function getPsiDesktopReport(done) {
  logPsiReport('DESKTOP PSI REPORT', 'desktop', done);
}

function getPsiMobileReport(done) {
  logPsiReport('MOBILE PSI REPORT', 'mobile', done);
}

function logPsiReport(title, strategy, done) {
  console.log('--------------------------------------');
  console.log(title);
  console.log('--------------------------------------');
  urls.forEach((url, index) => {
    psi(url, {
      nokey: 'true',
      strategy,
    }).then((data) => {
      console.log(url);
      console.log('Speed score:', data.ruleGroups.SPEED.score);
      if (strategy === 'mobile') {
        console.log('Usability score:', data.ruleGroups.USABILITY.score);
      }
      console.log('---');

      setTimeout(() => {
        if (index === (urls.length - 1)) {
          done();
        }
      }, 1000);
    });
  });
}

const getPsiReport = series(getAllBuildUrls, getPsiDesktopReport, getPsiMobileReport);

/**
 * Final (build)
 * --------------------------------------------------------------------------
 */

/**
 * ?????????????? ?? ?????????????????????? ??????????????????????
 * 1. ???????? ???????? ???????????? .png, .jpg, .svg ???? ./dev/assets/img/
 * 2. ?????????????????????? ??????????????????????
 * 3. ???????????????????? ?? ./build/assets/img/
 */

function exportImgBuild() {
  return src([
    `${devPath.assets.img}/**/*.{png,jpg,svg}`,
  ])
    .pipe(plumber())
    .pipe(imagemin([
      imagemin.jpegtran({ progressive: true }),
      imagemin.optipng({ optimizationLevel: 3 }),
      imagemin.svgo({
        plugins: [
          { removeViewBox: true },
          { cleanupIDs: false },
        ],
      }),
    ]))
    .pipe(dest(`${buildPath.assets.img}`));
}

/**
 * ?????????????? ????????????
 * ?????????????? ???????? ???????????? ???? ./dev/assets/ (?????????? ./dev/assets/img) ?? ./build/assets/
 */

function exportFilesBuild() {
  return src([
    `${devPath.assets.root}/**/*`,
    `!${devPath.assets.img}`,
    `!${devPath.assets.img}/**/*`,
  ])
    .pipe(dest(`${buildPath.assets.root}`));
}


const buildAssets = series(exportImgBuild, exportFilesBuild);

/**
 * Exports
 * --------------------------------------------------------------------------
 */

// ???????????? ?????????? ?? ???????????????? ?????? ???????????????? dev-????????????
exports.serve = series(
  // ??????????????
  cleanDev,
  // ?????????? ????????????
  fontGeneration,
  // ??????????????
  compileSvgSprite,
  compilePngSprite,
  // html
  compileHtml,
  // css
  compileCssGeneral,
  compileCssVendors,
  compileCssUiKit,
  compileCssComponents,
  // js
  compileJsCommon,
  compileJsVendors,
  compileJsUiKit,
  compileJsComponents,
  // export
  exportAssetsDev,
  // ?????????????????????????? dev-??????????????
  initDevServer,

  // ???????????? ?? ??????????????????
  (done) => {
    watchHtml();
    watchCss();
    watchJs();
    watchSvgSprite();
    watchPngSprite();
    watchAssets();
    watchFonts();

    done();
  },
);

// ???????????? ?????????? ?? ???????????????? ?????? ???????????????? components-library
exports.lib = series(
  // ??????????????
  cleanLib,
  // html
  compileHtmlLib,
  // css
  compileCssGeneralLib,
  compileCssVendorsLib,
  compileCssUiKitLib,
  compileCssComponentsLib,
  // js
  compileJsCommonLib,
  compileJsVendorsLib,
  compileJsComponentsLib,
  compileJsUiKitLib,
  // ?????????????????????????? lib-??????????????
  initLibServer,

  // ???????????? ?? ??????????????????
  (done) => {
    watchHtmlLib();
    watchCssLib();
    watchJsLib();

    done();
  },
);

// ???????????? ?????????? ?????? ???????????????? build-????????????
exports.build = series(
  // ??????????????
  cleanBuild,
  // ????????????
  buildHtml,
  buildCss,
  buildJs,
  buildFonts,
  buildAssets,
  // ?????????????????????????? build-??????????????
  initBuildServer,
  // Psi ??????????
  getPsiReport,
);
