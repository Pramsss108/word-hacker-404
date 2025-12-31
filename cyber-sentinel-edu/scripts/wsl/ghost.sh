#!/bin/bash
# THE GHOST - Identity Polimorphism
# Usage: ./ghost.sh [start|stop]

ACTION=$1

if [ "$ACTION" == "start" ]; then
    echo "GHOST_PROTOCOL_ENGAGED"
    # echo "CURRENT_MAC: $(cat /sys/class/net/wlan0/address)"
    echo "CURRENT_MAC: 00:11:22:33:44:55"
    
    # Real: macchanger -r wlan0
    sleep 1
    echo "MORPHING_IDENTITY..."
    echo "NEW_IDENTITY: Apple Inc (00:11:22:33:44:55)"
    
    sleep 2
    echo "MORPHING_IDENTITY..."
    echo "NEW_IDENTITY: Samsung (AA:BB:CC:DD:EE:FF)"
    
    sleep 2
    echo "MORPHING_IDENTITY..."
    echo "NEW_IDENTITY: Intel Corp (11:22:33:44:55:66)"

elif [ "$ACTION" == "stop" ]; then
    echo "GHOST_PROTOCOL_DISENGAGED"
    # Real: macchanger -p wlan0
    echo "IDENTITY_RESTORED"
else
    echo "Usage: ./ghost.sh [start|stop]"
fi
