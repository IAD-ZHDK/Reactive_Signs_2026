const path = require('./paths')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.build,
        publicPath: '/',
        filename: 'p5.posterControl.js',
        globalObject: 'this',
        library: {
            name: 'poster',
            type: 'umd',
        }
    },
    target: 'web',
    // Customize the webpack build process
    plugins: [
        // Removes/cleans build folders when rebuilding
        new CleanWebpackPlugin(),
    ],
    resolve: {
      modules: [path.src, 'node_modules'],
      extensions: ['.js', '.json'],
    },
}