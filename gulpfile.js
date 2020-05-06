/**
 * @license
 * The MIT License
 *
 * Copyright (c) 2016 Michael Zhou
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * @fileoverview Minification process for CodeMirror.
 * @author zhoumotongxue008@gmail.com (Michael Zhou)
 */

'use strict';

const {series, parallel, src, dest} = require('gulp');
const flatmap = require('gulp-flatmap');
const closureCompiler = require('google-closure-compiler').gulp();
const cleanCss = require('gulp-clean-css');

const CM_ROOT = 'CodeMirror/';
const SFDC_ROOT = 'sfdc/';

function runFlatMap() {
  return flatmap((stream, file) => {
    const pathAtCmRoot = file.relative.replace(CM_ROOT, 'dist/').replace(SFDC_ROOT, 'dist/');

    // Travis kills a build if no log output for 10 minutes
    console.log('Minifying ' + pathAtCmRoot);
    return stream.pipe(closureCompiler({
      compilation_level: 'SIMPLE',
      language_in: 'STABLE',
      language_out: 'ECMASCRIPT5_STRICT',
      js_output_file: pathAtCmRoot,
      warning_level: 'QUIET'
    }));
  });
}

function minifyMainJs() {
  return src(
              [
                // core
                CM_ROOT + 'lib/**/*.js',

                // mode
                CM_ROOT + 'mode/xml/xml.js',
                CM_ROOT + 'mode/javascript/javascript.js',
                CM_ROOT + 'mode/css/css.js',
                CM_ROOT + 'mode/htmlmixed/htmlmixed.js',

                // addon - fold
                CM_ROOT + 'addon/fold/foldcode.js',
                CM_ROOT + 'addon/fold/foldgutter.js',
                CM_ROOT + 'addon/fold/brace-fold.js',
                CM_ROOT + 'addon/fold/xml-fold.js',
                CM_ROOT + 'addon/fold/indent-fold.js',
                CM_ROOT + 'addon/fold/markdown-fold.js',
                CM_ROOT + 'addon/fold/comment-fold.js',

                // addon - auto-closed tag
                CM_ROOT + 'addon/edit/closetag.js',

                SFDC_ROOT + 'addon/sfdc/*.js',
              ],
             {base: '.'})
      .pipe(runFlatMap())
      .pipe(dest('.'));
}

function minifyCodeMirrorCss() {
  return src(
             [
               CM_ROOT + 'lib/codemirror.css',
               CM_ROOT + 'addon/fold/foldgutter.css', 
               SFDC_ROOT + 'addon/sfdc/htmlhint.css'
             ],
             {base: CM_ROOT})
      .pipe(cleanCss())
      .pipe(dest('dist'));
}

function minifySFDCCss() {
  return src(
             [
               SFDC_ROOT + 'addon/sfdc/htmlhint.css'
             ],
             {base: SFDC_ROOT})
      .pipe(cleanCss())
      .pipe(dest('dist'));
}

function copyTextFiles() {
  return src([CM_ROOT + 'AUTHORS', CM_ROOT + 'CHANGELOG.md'], {base: CM_ROOT})
      .pipe(dest('.'));
}

exports.minify = parallel(minifyMainJs, minifyCodeMirrorCss, minifySFDCCss);
exports.default = series(copyTextFiles, exports.minify);