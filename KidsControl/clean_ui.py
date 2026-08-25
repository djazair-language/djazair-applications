import re

with open("ParentApp/ui/template.dz", "r", encoding="utf-8") as f:
    content = f.read()

# Remove Relay polling logic from sendCmd
sendCmdPattern = r"""        if \(selectedDev\.ip === 'RELAY'\) \{.*?\} else \{"""
content = re.sub(sendCmdPattern, "        if (true) {", content, flags=re.DOTALL)

# Clean Settings Modal HTML
relayBannerPattern = r"""        <!-- Relay Server Status Alert -->.*?</div>"""
content = re.sub(relayBannerPattern, "", content, flags=re.DOTALL)

relayPortPattern = r"""          <div class='row g-3'>\s*<!-- Relay Port -->.*?</button>\s*</div>\s*<div id='portCheckResult'.*?</div>\s*</div>"""
content = re.sub(relayPortPattern, "          <div class='row g-3'>", content, flags=re.DOTALL)

externalHostPattern = r"""            <!-- External Server IP / Domain -->.*?</small>\s*</div>"""
content = re.sub(externalHostPattern, "", content, flags=re.DOTALL)

autoStartRelayPattern = r"""          <!-- Auto-Start Relay Toggle -->.*?</label>\s*<div class='text-muted'.*?</div>\s*</div>\s*</div>"""
content = re.sub(autoStartRelayPattern, "", content, flags=re.DOTALL)

# Clean JS configs
content = re.sub(r"\s*relay_port: 9999,", "", content)
content = re.sub(r"\s*external_host: '127\.0\.0\.1',", "", content)
content = re.sub(r"\s*auto_start_relay: true\n?", "\n", content)

content = re.sub(r"\s*\$\('#cfgRelayPort'\)\.val\(currentAppConfig\.relay_port \|\| 9999\);", "", content)
content = re.sub(r"\s*\$\('#cfgExternalHost'\)\.val\(currentAppConfig\.external_host \|\| '127\.0\.0\.1'\);", "", content)
content = re.sub(r"\s*\$\('#cfgAutoRelay'\)\.prop\('checked', currentAppConfig\.auto_start_relay !== false\);", "", content)

content = re.sub(r"\s*if \(res\.relay_running\).*?\}\s*", "", content, flags=re.DOTALL)

content = re.sub(r"\s*relay_port: parseInt\(\$\('#cfgRelayPort'\)\.val\(\), 10\) \|\| 9999,", "", content)
content = re.sub(r"\s*external_host: \$\('#cfgExternalHost'\)\.val\(\)\.trim\(\) \|\| '127\.0\.0\.1',", "", content)
content = re.sub(r"\s*auto_start_relay: \$\('#cfgAutoRelay'\)\.is\(':checked'\)\n?", "\n", content)

with open("ParentApp/ui/template.dz", "w", encoding="utf-8") as f:
    f.write(content)

print("UI cleaned from relay")
