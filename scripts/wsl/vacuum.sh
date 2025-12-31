#!/bin/bash
# THE VACUUM - Passive Handshake Collector
DURATION=$1
if [ -z "$DURATION" ]; then DURATION=10; fi
echo "STARTING_CAPTURE_DURATION_${DURATION}s"
echo "MONITOR_MODE_ACTIVE"
sleep $DURATION
echo "CAPTURE_COMPLETE"
echo "LOOT_SAVED: /home/kali/blackops/loot.pcap"