import re

with open("ParentApp/bridge/network.dz", "r", encoding="utf-8") as f:
    content = f.read()

# We want to replace the app.bridge.on("refreshDevices", fn(payload) block
# Since we refactored it to be identical to scanNetwork, we can just replace it entirely.

new_refresh_block = """    app.bridge.on("refreshDevices", fn(payload)
        let candidates = []
        let found = []

        if not isNull(payload)
            try
                let devList = json.decode(payload)
                if type(devList) == "Array"
                    for dev in devList
                        if type(dev) == "Map" and dev.has("ip")
                            candidates.append(dev["ip"])
                        end
                    end
                end
            catch e end
        end

        if candidates.length() == 0
            return []
        end

        let ts = str(datetime.ticks())
        
        for ip in candidates
            let port = config.AGENT_TCP_PORT
            let code = `
use net
use file
try
    let c = new net.tcpClient()
    if c.connect("${ip}", ${port})
        c.send("KIDS_CTRL_2026|||PING")
        let r = c.receive(128)
        c.close()
        if !isNull(r) and r.startsWith("PONG")
            file.write("__kc_${ts}_${ip}", r)
        end
    end
catch e end
`
            thread.spawnCode(code)
        end

        process.sleep(1.0)

        for ip in candidates
            let f = "__kc_" + ts + "_" + ip
            if file.isFile(f)
                let rContent = file.read(f).strip()
                let hname = ip
                if rContent.contains(":")
                    let p = rContent.split(":")
                    if p.length() > 1 and p[1].strip() != ""
                        hname = p[1].strip()
                    end
                elif ip == "127.0.0.1"
                    hname = "localhost (this machine)"
                end
                found.append({
                    "ip":       ip,
                    "hostname": hname,
                    "port":     config.AGENT_TCP_PORT
                })
                try file.delete(f) catch e end
            end
        end

        let newOnline = {}
        for dev in found
            let h = dev["hostname"]
            newOnline[h] = True
            if not knownOnline.has(h)
                notifyOnline(h)
            end
        end

        let keys = knownOnline.keys()
        for k in keys
            knownOnline.pop(k)
        end
        for k in newOnline.keys()
            knownOnline[k] = True
        end

        return found
    end)"""

pattern = r'    app\.bridge\.on\("refreshDevices", fn\(payload\).*?return found\n    end\)'
new_content = re.sub(pattern, new_refresh_block, content, flags=re.DOTALL)

with open("ParentApp/bridge/network.dz", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Restored efficient refreshDevices logic with robust JSON decoding.")
