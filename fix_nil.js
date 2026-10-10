const fs = require('fs');
const files = ['internal/repository/postgres.go', 'internal/repository/sqlite.go'];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add nilIfEmpty if it doesn't exist
    if (!content.includes('func nilIfEmpty(')) {
        content += `\nfunc nilIfEmpty(s string) interface{} {\n\tif s == "" {\n\t\treturn nil\n\t}\n\treturn s\n}\n`;
        fs.writeFileSync(file, content);
        console.log("Added nilIfEmpty to " + file);
    }
}
