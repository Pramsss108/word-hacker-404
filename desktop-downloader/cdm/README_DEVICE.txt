⚠️ WIDEVINE DEVICE REQUIRED ⚠️

To enable the "Black Ops" Decryption Module, you must provide a valid Widevine L3 Device file.
This file acts as the "Hardware Identity" that allows us to request licenses from Udemy.

INSTRUCTIONS:
1. Obtain a `.wvd` file (Widevine Device) from a physical Android device or using a dumper tool.
   (We cannot provide this file for legal reasons, but you can dump your own phone's L3 keys).
2. Rename the file to `device.wvd`.
3. Place it in this folder: `desktop-downloader/cdm/device.wvd`.

ALTERNATIVE (Raw Keys):
If you have the raw keys extracted, you can place them here as:
- `client_id.bin` (The Client Identification Blob)
- `private_key.pem` (The RSA Private Key)

The system will automatically detect these files on startup.
