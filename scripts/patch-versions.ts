// tslint:disable:no-implicit-dependencies
import { readFileSync, writeFileSync } from 'fs';

import bump from 'conventional-recommended-bump';
import { inc, valid } from 'semver';
const packageJson = JSON.parse(readFileSync('./package.json', { encoding: 'utf-8' }));

const getNextVersion = (currentVersion: string) => {
	return new Promise((resolve, reject) => {
		bump(
			{
				preset: 'angular'
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

getNextVersion(packageJson.version)
	.then(version => {
		const manifest = JSON.parse(readFileSync('./src/manifest.json', { encoding: 'utf-8' }));
		manifest.version = version;
		writeFileSync('./src/manifest.json', JSON.stringify(manifest, null, '\t'));


		let edgeManifest = readFileSync('./edge/AppXManifest.xml', { encoding: 'utf-8' });
		edgeManifest = edgeManifest.replace(/(Version=")((?:\d\.){3}\d)(")/, `$1${version}.0$3`);
		writeFileSync('./edge/AppXManifest.xml', edgeManifest);
	})
	// tslint:disable-next-line: no-console
	.catch((error: Error) => console.error(error));
