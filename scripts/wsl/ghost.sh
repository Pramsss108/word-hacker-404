#!/bin/bash
# THE GHOST - Polymorphic Identity
echo "CURRENT_IDENTITY_CHECK..."
ip link show eth0 | grep ether
echo "ROTATING_MAC_ADDRESS..."
# sudo macchanger -r eth0
echo "NEW_IDENTITY_ESTABLISHED"
ip link show eth0 | grep ether