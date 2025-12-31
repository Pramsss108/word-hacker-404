#!/bin/bash
# Cyber Sentinel Edu - Advanced Arsenal Installer
# Installs: Hostapd (Evil Twin), Hashcat (GPU Cracking), Wifiphisher (Social Eng)

echo "[*] 🚀 INITIALIZING ADVANCED ARMORY INSTALLATION..."

# 1. Evil Twin Tools
echo "[*] Installing Evil Twin Core (hostapd + dnsmasq)..."
sudo apt install -y hostapd dnsmasq iptables

# 2. GPU Cracking Tools
echo "[*] Installing Hashcat (Password Cracker)..."
sudo apt install -y hashcat

# 3. Advanced Frameworks (Optional - Large Download)
echo "[*] Installing Python Dependencies for Social Engineering..."
sudo apt install -y python3-pip python3-setuptools

echo "[+] ADVANCED MODULES INSTALLED."
echo "[!] NOTE: Evil Twin requires a secondary WiFi Adapter."
echo "[!] NOTE: Hashcat requires configured GPU drivers in WSL."
