import re

new_content = """use net
use process
use thread
use datetime
use file
use json
import "../core/config.dz" as config

let knownOnline = {}

fn notifyOnline(hostname)
    let code = `
use file
use process
let ps = \\`
Add-Type -AssemblyName System.Windows.Forms
$balloon = New-Object System.Windows.Forms.NotifyIcon
$balloon.Icon = [System.Drawing.SystemIcons]::Information
$balloon.BalloonTipIcon = 'Info'
$balloon.BalloonTipTitle = 'Kids Control Center'
$balloon.BalloonTipText = 'Device [${hostname}] is now online!'
$balloon.Visible = $true
$balloon.ShowBalloonTip(3000)
Start-Sleep -Seconds 4
$balloon.Dispose()
\\`
file.write("__kc_notify.ps1", ps)
process.exec("powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File __kc_notify.ps1")
try file.delete("__kc_notify.ps1") catch e end
`
    thread.spawnCode(code)
end

fn register(app)
    app.bridge.on("scanNetwork", fn(payload)
        let found = []
        let r = process.exec("arp -a")
        let lines = r["stdout"].split("\\n")
        let candidates = []

        for line in lines
            let t = line.strip()
            if t != "" and t.contains("dynamic")
                let parts = t.split(" ")
                let ip = parts[0].strip()
                if ip != ""
                    candidates.append(ip)
                end
            end
        end
        candidates.append("127.0.0.1")
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

        process.sleep(1.5)

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
    end)

    app.bridge.on("refreshDevices", fn(payload)
        let candidates = []
        let found = []

        if not isNull(payload)
            try
                for dev in payload
                    if type(dev) == "Map" and dev.has("ip")
                        candidates.append(dev["ip"])
                    elif type(dev) == "String"
                        candidates.append(dev)
                    end
                end
            catch e end
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

        if candidates.length() > 0
            process.sleep(1.5)
        end

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
    end)

    app.bridge.on("loadDevices", fn(payload)
        try
            if file.isFile(config.DEVICES_FILE)
                return json.decode(file.read(config.DEVICES_FILE))
            end
        catch e end
        return []
    end)

    app.bridge.on("saveDevices", fn(payload)
        try
            file.write(config.DEVICES_FILE, json.encode(payload))
            return True
        catch e
            return False
        end
    end)
end
"""

with open("ParentApp/bridge/network.dz", "w", encoding="utf-8") as f:
    f.write(new_content)

print("network.dz refactored to use raw strings and interpolations.")
