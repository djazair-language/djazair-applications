import re

with open("ChildApp/main.dz", "r", encoding="utf-8") as f:
    content = f.read()

# Pattern to remove the entire Relay section
pattern = r'# ── Relay Client Thread ──.*?\n    thread\.spawnCode\(r_code\)\nend'
new_content = re.sub(pattern, "", content, flags=re.DOTALL)

with open("ChildApp/main.dz", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Removed Relay logic from ChildApp")
