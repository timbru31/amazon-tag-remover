import { readFileSync, writeFileSync } from 'fs';

// tslint:disable-next-line:no-implicit-dependencies
import bump from 'conventional-recommended-bump';
// tslint:disable-next-line:no-implicit-dependencies
import { inc, ReleaseType, valid } from 'semver';
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
				const nextVersion = valid(release.releaseType) || inc(currentVersion, release.releaseType as ReleaseType);
				resolve(nextVersion);
			}
		);
	});
};

getNextVersion(version)
	.then((newVersion) => {
		const manifest = JSON.parse(readFileSync('./src/manifest.json', { encoding: 'utf-8' }));
		manifest.version = newVersion;
		writeFileSync('./src/manifest.json', JSON.stringify(manifest, null, '\t'));
	})
	// tslint:disable-next-line: no-console
	.catch((error: Error) => console.error(error));
