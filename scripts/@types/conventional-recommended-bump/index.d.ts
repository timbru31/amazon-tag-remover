declare module 'conventional-recommended-bump' {
	import { ReleaseType } from 'semver';
	interface Options {
		ignoreReverted?: boolean;
		preset?: string;
		config?: any;
		whatBump?: any[];
		tagPrefix?: string;
		lernaPackage?: string;
	}
	interface Recommendation {
		reason: string;
		releaseType: ReleaseType;
	}
	export default function bump(options: Options, fn: (err: Error, recommendation: Recommendation) => void): void;
}
