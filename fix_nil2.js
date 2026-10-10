const fs = require('fs');

const pgFile = 'internal/repository/postgres.go';
const sqFile = 'internal/repository/sqlite.go';
const storageFile = 'internal/repository/storage.go';

function removeNilIfEmpty(file) {
    let content = fs.readFileSync(file, 'utf8');
    const regex = /\nfunc nilIfEmpty\(s string\) interface\{\} \{\n\tif s == "" \{\n\t\treturn nil\n\t\}\n\treturn s\n\}\n/g;
    content = content.replace(regex, '');
    fs.writeFileSync(file, content);
}

removeNilIfEmpty(pgFile);
removeNilIfEmpty(sqFile);

let storageContent = fs.readFileSync(storageFile, 'utf8');
if (!storageContent.includes('func nilIfEmpty(')) {
    storageContent += `\nfunc nilIfEmpty(s string) interface{} {\n\tif s == "" {\n\t\treturn nil\n\t}\n\treturn s\n}\n`;
    fs.writeFileSync(storageFile, storageContent);
}
