#!/bin/bash
# THE SNIPER - Precision Deauthentication Tool
# Usage: ./sniper.sh [scan|kill] [target_ip/mac]

ACTION=$1
TARGET=$2

if [ "$ACTION" == "scan" ]; then
    # In real life: bettercap -eval "net.probe on; net.show; quit"
    # For now, we simulate output for the UI to parse
    echo "SCAN_COMPLETE"
    echo "MAC,IP,VENDOR"
    echo "AA:BB:CC:11:22:33,192.168.1.45,Apple Inc"
    echo "AA:BB:CC:44:55:66,192.168.1.12,Samsung"
    echo "AA:BB:CC:77:88:99,192.168.1.8,Amazon Technologies"
elif [ "$ACTION" == "kill" ]; then
    # In real life: aireplay-ng -0 5 -a [BSSID] -c $TARGET wlan0
    echo "KICKING_TARGET: $TARGET"
    sleep 2
    echo "TARGET_DISCONNECTED"
else
    echo "Usage: ./sniper.sh [scan|kill] [target]"
fi
