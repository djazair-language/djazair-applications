import re

with open("ParentApp/bridge/network.dz", "r", encoding="utf-8") as f:
    content = f.read()

correct_code = """            let code = "
use net
use file
try
    let c = new net.tcpClient()
    if c.connect(\\"" + ip + "\\", " + str(config.AGENT_TCP_PORT) + ")
        c.send(\\"KIDS_CTRL_2026|||PING\\")
        let r = c.receive(128)
        c.close()
        if !isNull(r) and r.startsWith(\\"PONG\\")
            file.write(\\"__kc_" + ts + "_" + ip + "\\", r)
        end
    end
catch e end
"
"""

# We'll use regex to replace both occurrences of the let code = " ... " block
pattern = r'            let code = ".*?catch e end\n"\n'
new_content = re.sub(pattern, correct_code, content, flags=re.DOTALL)

with open("ParentApp/bridge/network.dz", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Fixed indentation of thread.spawnCode blocks in network.dz")
