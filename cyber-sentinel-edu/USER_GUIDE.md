# 🛡️ CYBER SENTINEL EDU - FIELD MANUAL

**Welcome, Operator.**
This guide will teach you how to use your new Cyber Sentinel dashboard. This tool is designed to be "Point and Click" — no coding required.

---

## 🚀 PHASE 1: LAUNCH SEQUENCE

1.  **Navigate:** Open the folder `cyber-sentinel-edu`.
2.  **Execute:** Double-click the file named **`LAUNCH_APP.bat`**.
3.  **Authorize:** If Windows asks for permission (Admin), click **Yes**.
4.  **Wait:** A black window will open. It will clean the system and build the interface.
    *   *Note: The first launch might take 10-15 seconds.*
5.  **Engage:** The dashboard will open automatically.
    *   **IMPORTANT:** Do NOT close the black window. That is the engine running in the background.

---

## 🖥️ PHASE 2: THE DASHBOARD

### 1. System Status (Top Bar)
This tells you the health of your hacking rig.
*   **WSL2 STATUS:**
    *   🟢 **ONLINE:** The Linux engine is running perfectly.
    *   🔴 **OFFLINE:** You need to restart your computer or reinstall.
*   **ADAPTER STATUS:**
    *   🟢 **ADAPTER CONNECTED:** Your USB WiFi antenna is active. You are seeing **REAL** networks.
    *   🟡 **SIMULATION MODE:** No adapter found. You are seeing **FAKE** demo data for practice.

### 2. Spectrum Analyzer (Left Panel)
This is your "Radar".
*   **START RECON:** Click this to scan the airwaves for WiFi networks.
*   **The List:** Shows every network nearby.
    *   **Green Bars:** Strong signal (Easy target).
    *   **Yellow/Red:** Weak signal (Hard to hack).
    *   **WPS:** If you see a "WPS" tag, it's vulnerable to a fast crack.

### 3. Attack Vector (Right Panel)
This is your "Command Console".
*   It stays empty until you select a target.
*   Once a target is selected, it shows available options.

---

## ⚔️ PHASE 3: MISSION WALKTHROUGH

### Step 1: Reconnaissance (Finding Targets)
1.  Click the green **START RECON** button.
2.  Watch as the list populates with networks.
3.  *Tip: If in Simulation Mode, this happens instantly.*

### Step 2: Target Acquisition
1.  Scroll through the list.
2.  **Click** on a network you want to test.
3.  It will highlight in **Green**, and the Right Panel will activate.

### Step 3: Engagement (The Hack)
1.  Look at the **Attack Vector** panel on the right.
2.  Choose an Action:
    *   **DEAUTH (Jammer):** Kicks everyone off that WiFi network. Good for pranks or testing security.
    *   **PIXIE DUST (Cracker):** Attempts to steal the password instantly (works best on "WPS" networks).
    *   **EVIL TWIN:** Creates a fake copy of the network to trick users (Advanced).
3.  Click **EXECUTE**.

### Step 4: Analysis
1.  Watch the **Log Window** at the bottom.
2.  It will show you what the engine is doing (e.g., "Injecting Packets", "Capturing Handshake").
3.  If successful, it will display the password or success message.

---

## 🕵️ PHASE 4: DECODING THE RESULTS (WHAT TO EXPECT)

**"I clicked the button... now what?"**

### Option A: GOD MODE (The "Lazy" Button)
*   **What you do:** Click the red **GOD MODE** button.
*   **What happens:** The AI takes over. It scans, finds the weakest target (usually a WPS one), and attacks it automatically.
*   **The Result:** You sit back and watch. If it works, the **PASSWORD** will appear in the green log window.

### Option B: MANUAL ATTACK (The "Sniper" Approach)
You selected a target and clicked a specific button. Here is what you get:

#### 1. DEAUTH (The Jammer)
*   **Goal:** Kick people off the WiFi.
*   **Visual:** You won't see a password yet.
*   **Result:** The log will say **"Handshake Captured"**.
    *   *What this means:* You stole the "key" to the door, but it's locked. In a real scenario, you would use a "Cracker" to open it later. For now, you have successfully disrupted the network.

#### 2. PIXIE DUST (The Magic Key)
*   **Goal:** Get the password instantly.
*   **Requirement:** The network must have "WPS" (Look for the red WPS tag).
*   **Result:**
    *   **Success:** The log will show: `PASSWORD FOUND: "some_password"`.
    *   **Failure:** The log will say "WPS Locked" or "Timeout".

#### 3. EVIL TWIN (The Trap)
*   **Goal:** Trick users into giving you the password.
*   **Result:** The app creates a **FAKE WiFi** with the same name.
    *   *Real Life:* You wait for a person to connect to YOUR fake WiFi and type their password.
    *   *Simulation:* The log will show "Client Connected" and then "Password Intercepted".

---

## ⚠️ TROUBLESHOOTING

**"It says Simulation Mode but I have my adapter plugged in!"**
1.  Windows doesn't automatically give the USB to the Linux engine.
2.  We will need to run a special "USB Attach" command (Coming in the next update once your hardware arrives).

**"The screen is blank!"**
1.  Close everything.
2.  Run `LAUNCH_APP.bat` again.
3.  Wait for the "Building frontend assets" message to finish.

**"I want to stop."**
1.  Just close the main window.
2.  The black engine window will close automatically.

---

*Authorized for Educational Use Only.*
*Cyber Sentinel v2.0.0*
