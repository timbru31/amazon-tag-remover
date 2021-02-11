// tslint:disable: no-implicit-dependencies
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

module.exports = (_env: string, argv: Record<string, boolean | number | string>): webpack.Configuration => ({
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
