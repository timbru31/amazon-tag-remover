// tslint:disable:no-implicit-dependencies
import { readFileSync, writeFileSync } from 'fs';

import bump from 'conventional-recommended-bump';
import { inc, valid } from 'semver';
import { version } from '../package.json';

const getNextVersion = (currentVersion: string) => {
	return new Promise((resolve, reject) => {
		bump(
			{
				preset: 'angular',
			},
			(err, release) => {
				if (err) {
					reject(err);
					return;
				}
				const nextVersion = valid(release.releaseType) || inc(currentVersion, release.releaseType);
				resolve(nextVersion);
			}
		);
	});
};

getNextVersion(version)
	.then((version) => {
		const manifest = JSON.parse(readFileSync('./src/manifest.json', { encoding: 'utf-8' }));
		manifest.version = version;
		writeFileSync('./src/manifest.json', JSON.stringify(manifest, null, '\t'));
	})
	// tslint:disable-next-line: no-console
	.catch((error: Error) => console.error(error));
