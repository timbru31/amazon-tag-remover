// tslint:disable: no-implicit-dependencies
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';
import webpack from 'webpack';

module.exports = (_env: string, argv: Record<string, boolean | number | string>): webpack.Configuration => ({
	devtool: argv.mode === 'production' ? undefined : 'source-map',
	entry: {
		background: './src/js/background.ts',
		options: './src/js/options.ts',
	},
	output: {
		filename: '[name].js',
		path: path.join(__dirname, 'dist'),
	},
	// tslint:disable-next-line: object-literal-sort-keys
	module: {
		rules: [
			{
				exclude: /node_modules/,
				test: /\.ts$/,
				use: [
					{
						loader: 'ts-loader',
						query: {
							compilerOptions: {
								module: 'esnext',
								noEmitOnError: argv.watch === false,
							},
							transpileOnly: true,
						},
					},
				],
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new CopyWebpackPlugin({
			patterns: [
				{
					context: 'src',
					from: '*',
					globOptions: {
						ignore: ['*.js', '*.ts'],
					},
				},
				{
					context: 'src/images',
					from: '*',
					globOptions: {
						ignore: ['*.js', '*.ts'],
					},
					to: 'images',
				},
				{
					from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
				},
			],
		}),
	],
	resolve: {
		extensions: ['.ts'],
	},
});
