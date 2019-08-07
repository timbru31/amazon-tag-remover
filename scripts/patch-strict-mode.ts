// tslint:disable:no-implicit-dependencies
import { readFileSync, writeFileSync } from 'fs';

let data = readFileSync('./dist/browser-polyfill.min.js', { encoding: 'utf-8' });
data = data.replace('"use strict";', '');
writeFileSync('./dist/browser-polyfill.min.js', data);
