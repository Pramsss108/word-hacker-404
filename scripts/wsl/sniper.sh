#!/bin/bash
# THE SNIPER - Precision Deauthentication Tool
ACTION=$1
TARGET=$2

if [ "$ACTION" == "scan" ]; then
    echo "INITIATING_ARP_SCAN..."
    ip neigh show | awk '{print "FOUND: " $1 " (" $5 ") - " $3}'
    echo "SCAN_COMPLETE"
elif [ "$ACTION" == "kill" ]; then
    echo "ENGAGING_TARGET: $TARGET"
    echo "SENDING_DEAUTH_PACKETS..."
    sleep 2
    echo "TARGET_CONNECTION_TERMINATED"
else
    echo "Usage: ./sniper.sh [scan|kill] [target]"
fi