// tslint:disable: no-implicit-dependencies
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { resolve } from 'path';
import webpack, { WebpackPluginInstance } from 'webpack';

module.exports = (_env: string, argv: Record<string, boolean | number | string>): webpack.Configuration => ({
	output: {
		path: resolve(__dirname, 'dist'),
	},
	devtool: argv.mode === 'production' ? undefined : 'source-map',
	entry: {
		background: './src/js/background.ts',
		options: './src/js/options.ts',
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
						options: {
							transpileOnly: true,
							compilerOptions: {
								module: 'esnext',
								noEmitOnError: argv.watch === false,
							},
						},
					},
				],
			},
		],
	},
	plugins: [
		(new CleanWebpackPlugin() as unknown) as WebpackPluginInstance,
		(new CopyWebpackPlugin({
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
		}) as unknown) as WebpackPluginInstance,
	],
	resolve: {
		extensions: ['.ts'],
	},
});
