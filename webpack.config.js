const webpack = require('webpack');
const path = require('path');
const packageInfo = require('./package.json');

const libraryName = packageInfo.library || packageInfo.name;
const version = packageInfo.version;
const minify = process.env.NODE_ENV === 'production';
const outputFile = `${libraryName}-${version}${minify ? '.min' : ''}.js`;

const config = {
  entry: `${__dirname}/index.js`,
  devtool: 'source-map',
  output: {
    path: `${__dirname}/dist`,
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  module: {
    loaders: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel',
        exclude: /(node_modules|bower_components)/,
      },
    ],
  },
  externals: {
    xpath: {
      commonjs: 'xpath',
      commonjs2: 'xpath',
      amd: 'xpath',
      root: 'xpath',
    },
    jsdom: {
      commonjs: 'jsdom',
      commonjs2: 'jsdom',
      amd: 'jsdom',
      root: 'jsdom',
    },
  },
  resolve: {
    root: path.resolve('./src'),
    extensions: ['', '.js'],
  },
  plugins: minify
    ? [
      new webpack.optimize.UglifyJsPlugin({
        compress: { warnings: false },
      }),
    ]
    : [],
};

module.exports = config;
