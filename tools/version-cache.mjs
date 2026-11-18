import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const file='dist/sw.js',source=await readFile(file,'utf8'),match=source.match(/const ASSETS=(\[[\s\S]*?\]);/);
if(!match)throw Error('The offline asset manifest is missing.');
const assets=JSON.parse(match[1].replace(/'/g,'"')),hash=createHash('sha256');
hash.update(source.replace(/const CACHE='[^']+'/,"const CACHE='VERSION'"));
for(const asset of [...assets].sort()){if(asset==='./')continue;hash.update(asset);hash.update(await readFile('dist/'+asset.replace(/^\.\//,'')));}
const version=hash.digest('hex').slice(0,12);
await writeFile(file,source.replace(/const CACHE='[^']+'/,`const CACHE='bookwiz-shell-${version}'`));
console.log('Offline cache version prepared.');
