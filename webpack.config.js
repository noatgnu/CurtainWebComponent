const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const glob = require('glob');

const chunkFiles = glob.sync('./dist/curtain-web-component/browser/chunk-*.js');
module.exports = {
  entry: [
    './dist/curtain-web-component/browser/polyfills.js',
    './dist/curtain-web-component/browser/main.js',
    ...chunkFiles,
    './dist/curtain-web-component/browser/styles.css' // Include the CSS file
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },

    ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist/')
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './dist/curtain-web-component/browser/index.html',
      inject: 'body'
    })
  ],
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  }
};
