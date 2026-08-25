import os

with open("ChildApp/main.dz", "r", encoding="utf-8") as f:
    content = f.read()

idx1 = content.find("if USE_RELAY")
idx2 = content.find("# ── Server Setup")

top = content[:idx1]
bottom = content[idx2:]

# Escape top for Djazair string
top_escaped = top.replace("\\", "\\\\").replace('"', '\\"').replace("\r", "\\r").replace("\n", "\\n")

r_code_block = f"""if USE_RELAY
    let r_code = "{top_escaped}" + "while True\\n    try\\n        let c = new net.tcpClient()\\n        if c.connect(\\"" + RELAY_HOST + "\\", " + str(RELAY_PORT) + ")\\n            c.send(\\"POLL:\\" + _hostname)\\n            let cmd = c.receive(1024 * 1024)\\n            c.close()\\n            if !isNull(cmd) and cmd != \\"NONE\\"\\n                let resp = dispatch(cmd)\\n                let c2 = new net.tcpClient()\\n                if c2.connect(\\"" + RELAY_HOST + "\\", " + str(RELAY_PORT) + ")\\n                    c2.send(\\"RESP:\\" + _hostname + \\":\\" + resp)\\n                    c2.close()\\n                end\\n            end\\n        end\\n    catch e end\\n    process.sleep(1.0)\\nend\\n"
    thread.spawnCode(r_code)
end

"""

new_content = top + r_code_block + bottom
with open("ChildApp/main.dz", "w", encoding="utf-8") as f:
    f.write(new_content)
print("Synced r_code successfully!")
