#!/bin/bash
# Cyber Sentinel Edu - Auto Installer
echo "[*] Updating Repositories..."
sudo apt update
echo "[*] Installing Arsenal..."
sudo apt install -y aircrack-ng bully reaver hcxdumptool macchanger
echo "[+] Installation Complete."
