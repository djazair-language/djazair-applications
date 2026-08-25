import re

with open("ParentApp/bridge/network.dz", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'        try\n            let c = new net\.tcpClient\(\)\n            if c\.connect\("127\.0\.0\.1", 9999\)\n                c\.send\("GET_CHILDREN"\)[\s\S]*?catch e end\n'

new_content = re.sub(pattern, "", content)

with open("ParentApp/bridge/network.dz", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Removed GET_CHILDREN logic")
