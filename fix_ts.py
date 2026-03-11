import re
with open('february-2026-timesheet.md', 'r', encoding='utf-8') as f:
    content = f.read()
# Fix line 35 - remove garbage
content = re.sub(r'\| 7     \| vague.*?\| 2     \|\s*', '| 7     |\n', content, flags=re.DOTALL)
content = re.sub(r"code\.'re\.", 'code.', content)
content = re.sub(r"code.'re\.", 'code.', content)
with open('february-2026-timesheet.md', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
