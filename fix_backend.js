const fs = require('fs');

// 1. Fix models.go syntax error
const modelsFile = 'internal/domain/models.go';
let modelsContent = fs.readFileSync(modelsFile, 'utf8');

const oldStruct = `type Ticket struct {
	ID          string    json:"id"
	TenantID    string    json:"tenant_id"
	CustomerID  string    json:"customer_id"
	Title       string    json:"title"
	Description string    json:"description"
	Status      string    json:"status"
	Priority    string    json:"priority"
	Category    string    json:"category"
	AssigneeID  string    json:"assignee_id"
	CreatedAt   time.Time json:"created_at"
	UpdatedAt   time.Time json:"updated_at"
}`;

const newStruct = `type Ticket struct {
	ID          string    \`json:"id"\`
	TenantID    string    \`json:"tenant_id"\`
	CustomerID  string    \`json:"customer_id"\`
	Title       string    \`json:"title"\`
	Description string    \`json:"description"\`
	Status      string    \`json:"status"\`
	Priority    string    \`json:"priority"\`
	Category    string    \`json:"category"\`
	AssigneeID  string    \`json:"assignee_id"\`
	CreatedAt   time.Time \`json:"created_at"\`
	UpdatedAt   time.Time \`json:"updated_at"\`
}`;

if (modelsContent.includes(oldStruct)) {
    modelsContent = modelsContent.replace(oldStruct, newStruct);
    fs.writeFileSync(modelsFile, modelsContent);
    console.log("models.go fixed");
} else {
    // maybe parts are matched
    modelsContent = modelsContent.replace(/json:"id"/g, '\`json:"id"\`');
    modelsContent = modelsContent.replace(/json:"tenant_id"/g, '\`json:"tenant_id"\`');
    modelsContent = modelsContent.replace(/json:"customer_id"/g, '\`json:"customer_id"\`');
    modelsContent = modelsContent.replace(/json:"title"/g, '\`json:"title"\`');
    modelsContent = modelsContent.replace(/json:"description"/g, '\`json:"description"\`');
    modelsContent = modelsContent.replace(/json:"status"/g, '\`json:"status"\`');
    modelsContent = modelsContent.replace(/json:"priority"/g, '\`json:"priority"\`');
    modelsContent = modelsContent.replace(/json:"category"/g, '\`json:"category"\`');
    modelsContent = modelsContent.replace(/json:"assignee_id"/g, '\`json:"assignee_id"\`');
    modelsContent = modelsContent.replace(/json:"created_at"/g, '\`json:"created_at"\`');
    modelsContent = modelsContent.replace(/json:"updated_at"/g, '\`json:"updated_at"\`');
    // clean up duplicate backticks if any
    modelsContent = modelsContent.replace(/\`\`json/g, '\`json');
    modelsContent = modelsContent.replace(/\"\`\`/g, '\"\`');
    fs.writeFileSync(modelsFile, modelsContent);
    console.log("models.go fixed (fallback)");
}

// 2. Rename migration files
const fsPromises = require('fs').promises;
const path = require('path');
async function renameMigrations() {
    const migrationsDir = path.join('apps', 'api', 'migrations');
    try {
        await fsPromises.rename(
            path.join(migrationsDir, '000024_create_tickets_table.up.sql'),
            path.join(migrationsDir, '000057_create_tickets_table.up.sql')
        );
        console.log("Renamed up migration");
    } catch(e) {}
    try {
        await fsPromises.rename(
            path.join(migrationsDir, '000024_create_tickets_table.down.sql'),
            path.join(migrationsDir, '000057_create_tickets_table.down.sql')
        );
        console.log("Renamed down migration");
    } catch(e) {}
}

renameMigrations();
