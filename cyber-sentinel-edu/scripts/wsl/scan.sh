#!/bin/bash
# Cyber Sentinel Edu - Network Scanner
# Returns JSON-like structure for the UI

# Check if we are root
if [ "$EUID" -ne 0 ]; then 
  echo "ERROR: Please run as root"
  exit
fi

# Try using nmcli first (NetworkManager) as it's easiest to parse
if command -v nmcli &> /dev/null; then
    # Get list: SSID, BSSID, CHAN, SIGNAL, SECURITY
    # Format: SSID:BSSID:CHAN:SIGNAL:SECURITY
    nmcli -t -f SSID,BSSID,CHAN,SIGNAL,SECURITY dev wifi list | while IFS=: read -r ssid bssid chan signal security; do
        # Skip empty SSIDs
        if [ -z "$ssid" ]; then continue; fi
        
        # Determine Security Type
        SEC="OPEN"
        if [[ "$security" == *"WPA2"* ]]; then SEC="WPA2"; fi
        if [[ "$security" == *"WPA3"* ]]; then SEC="WPA3"; fi
        if [[ "$security" == *"WEP"* ]]; then SEC="WEP"; fi
        
        # Check for WPS (nmcli doesn't always show this, we might need wash later)
        WPS="false"
        
        # Mock Client count for now (requires airodump-ng to see real clients)
        CLIENTS=$((1 + $RANDOM % 10))

        echo "{\"ssid\": \"$ssid\", \"bssid\": \"$bssid\", \"channel\": $chan, \"signal\": $signal, \"security\": \"$SEC\", \"wps\": $WPS, \"clients\": $CLIENTS},"
    done
else
    # Fallback or Error
    echo "ERROR: nmcli not found. Ensure NetworkManager is running."
fi
