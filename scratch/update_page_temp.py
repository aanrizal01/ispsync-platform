
import re

file_path = '/home/anri01/ispsync/apps/web/app/page.tsx'
with open(file_path, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Remove Portal Agen link
content = re.sub(
    r'<Link\s+href="/agent/login"[^>]*>[\s\S]*?Portal Agen[\s\S]*?</Link>',
    '',
    content
)

# Update Buka Dashboard Demo to point to demo tenant
content = content.replace(
    'href="/login"',
    'href="https://cms.ispku.ispsync.id"'
)

# Keep the navbar Login Dashboard pointing to /login for SaaS Owner
# Since we replaced all href="/login", let's restore the navbar one:
content = content.replace(
    '<div className="flex items-center gap-3">\n            <Link\n              href="https://cms.ispku.ispsync.id"',
    '<div className="flex items-center gap-3">\n            <Link\n              href="/login"'
)

with open(file_path, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Updated page.tsx successfully.")
