# Run this script as Administrator in PowerShell
# It sets up port forwarding from Windows to WSL2 for phone access
# Usage: Right-click > Run with PowerShell (as Admin)

# Get WSL2 IP automatically
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
Write-Host "WSL2 IP: $wslIp"

# Reset existing port forwarding
netsh interface portproxy reset

# Forward port 3000 to WSL2
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp

# Add firewall rule (ignore error if already exists)
netsh advfirewall firewall delete rule name="WSL2 Port 3000" >$null 2>&1
netsh advfirewall firewall add rule name="WSL2 Port 3000" dir=in action=allow protocol=TCP localport=3000

# Show result
Write-Host ""
Write-Host "Port forwarding set up!" -ForegroundColor Green
Write-Host "  Windows -> WSL2: 0.0.0.0:3000 -> ${wslIp}:3000"
Write-Host ""

# Show Windows LAN IP for phone access
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback|WSL|vEthernet" -and $_.PrefixOrigin -eq "Dhcp" } | Select-Object -First 1).IPAddress
if ($lanIp) {
    Write-Host "Access from phone: http://${lanIp}:3000" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Note: Run this again after each WSL restart (the WSL2 IP can change)."
Read-Host "Press Enter to close"
