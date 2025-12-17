import { useState, useEffect } from "react";
import AppLayout from "./components/AppLayout";
import SearchEye from "./components/SearchEye";
import StarMap from "./components/StarMap";
import Brain from "./components/Brain";
import Shield from "./components/Shield";
import SystemMonitor from "./components/SystemMonitor"; // [NEW]
import HistoryPanel from "./components/HistoryPanel";
import HelpOverlay from "./components/HelpOverlay";

import ScannerLoader from "./components/ScannerLoader";
import CortexPanel from "./components/CortexPanel";
import { FirstRunWizard } from "./components/FirstRunWizard"; // [NEW]
import { invoke } from "@tauri-apps/api/core";

// Helper Component to keep App clean
function ShowWizardGate({ children }: { children: React.ReactNode }) {
  const [wizardDone, setWizardDone] = useState(sessionStorage.getItem("wizard_complete") === "true");

  if (wizardDone) return <>{children}</>;

  return <FirstRunWizard onComplete={() => {
    sessionStorage.setItem("wizard_complete", "true");
    setWizardDone(true);
  }} />;
}


// Define matched types locally or import if possible. For speed, using simple structure matching the props.
interface PreloadedData {
  nodes: any[];
  largestFiles: any[];
  drives: string[];
  diskStats: any;
  path: string;
}

function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [booting, setBooting] = useState(true);
  const [appData, setAppData] = useState<PreloadedData | null>(null);

  useEffect(() => {
    const bootSequence = async () => {
      const start = Date.now();
      let cacheLoaded = false;

      // 1. Try Cache First for Instant Boot (Using NEW Binary Snapshot)
      try {
        console.log("💿 [BOOT] Attempting to load Snapshot...");
        const count = await invoke<number>("load_index");

        // Also load Sector Cache (UI Persist)
        const cachedSector: any = await invoke("load_cached_sector", { path: "C:\\" });
        const drives = await invoke<string[]>("get_system_drives");
        const stats = await invoke<any>("get_disk_stats", { targetPath: "C:\\" });

        if (count > 0 && cachedSector) {
          console.log(`⚡ [BOOT] SNAPSHOT LOADED! ${count} items ready instantly.`);
          setAppData({
            nodes: cachedSector.nodes,
            largestFiles: cachedSector.largest_files,
            drives,
            diskStats: stats,
            path: "C:\\"
          });
          setBooting(false); // ULTRA INSTANT UNLOCK
          cacheLoaded = true;
        }
      } catch (e) {
        console.log("⚠️ [BOOT] Snapshot Miss:", e);
      }

      // 2. Run Real-Time Scan (Background Refresh)
      const scanTask = (async () => {
        try {
          console.log("🔄 [BOOT] Starting Background Reliability Scan...");

          // 2a. Fetch Drives
          const rawDrives = await invoke<string[]>("get_system_drives");
          const drives = rawDrives.length > 0 ? rawDrives : ["C:\\"];

          // 2b. Get recent files for home screen
          const recentFiles = await invoke<any[]>("get_recent_files", { limit: 20 });
          console.log("📂 [BOOT] Loaded recent files:", recentFiles.length);

          // 2c. Try RAM Index First (Fastest) - WITH SMART POLLING
          let scanResult: any = null;
          
          // Poll for up to 6 seconds (since DB takes ~5s to be ready)
          for (let i = 0; i < 12; i++) {
             try {
                 scanResult = await invoke("browse_ram_index", { path: "C:\\" });
                 console.log("⚡ [BOOT] RAM Index Used (Attempt " + (i+1) + ")");
                 break;
             } catch (e) {
                 // Wait 500ms and try again
                 await new Promise(r => setTimeout(r, 500));
             }
          }

          // If still failed after polling, fallback to Disk Scan
          if (!scanResult) {
             console.log("⚠️ [BOOT] RAM Index Timeout, falling back to Disk Scan...");
             scanResult = await invoke("scan_sector_unified", { path: "C:\\" });
          }

          const stats = await invoke<any>("get_disk_stats", { targetPath: "C:\\" });

          const data = {
            nodes: recentFiles.length > 0 ? recentFiles : scanResult.nodes,
            largestFiles: scanResult.largest_files,
            drives,
            diskStats: stats,
            path: "C:\\"
          };

          setAppData(data);

          if (!cacheLoaded) {
            setBooting(false);
          }
          return data;
        } catch (e) {
          console.error("Boot Scan Failed:", e);
          return null;
        }
      })();

      // 3. Fallback Loader (Only if cache missed)
      if (!cacheLoaded) {
        // ELITE FIX: Reduced timeout to 3s to prevent hanging
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 3000));
        await Promise.race([scanTask, timeoutPromise]);

        // Minimum Animation if we had to wait
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 1000 - elapsed);
        setTimeout(() => setBooting(false), remaining);
      }
    };

    bootSequence();

    // ELITE FAIL-SAFE: Force entry after 3s even if Backend Hangs
    const safetyTimer = setTimeout(() => {
      console.warn("⚠️ Boot Sequence Timeout - Forcing Entry");
      setBooting(false);
    }, 3000);

    return () => clearTimeout(safetyTimer);
  }, []);

  const [isCortexOpen, setIsCortexOpen] = useState(false);

  const handleSkip = () => setBooting(false);

  return (
    <>
      <ScannerLoader visible={booting} path="BOOT" onSkip={handleSkip} />

      {/* AI Wizard Gate */}
      {!booting && (
        <ShowWizardGate>
          <AppLayout
            onTabChange={setActiveTab}
            activeTab={activeTab}
            isCortexOpen={isCortexOpen}
            onToggleCortex={() => setIsCortexOpen(!isCortexOpen)}
          >
            <div className={`h-full ${activeTab === "search" ? "block" : "hidden"}`}>
              <SearchEye />
            </div>
            <div className={`h-full ${activeTab === "map" ? "block" : "hidden"}`}>
              <StarMap preloadedData={appData} />
            </div>
            <div className={`h-full ${activeTab === "brain" ? "block" : "hidden"}`}>
              <Brain />
            </div>
            <div className={`h-full ${activeTab === "monitor" ? "block" : "hidden"}`}>
              <SystemMonitor onBack={() => setActiveTab("search")} />
            </div>
            <div className={`h-full ${activeTab === "shield" ? "block" : "hidden"}`}>
              <Shield />
            </div>
            <div className={`h-full ${activeTab === "history" ? "block" : "hidden"}`}>
              <HistoryPanel />
            </div>
          </AppLayout>
        </ShowWizardGate>
      )}

      <CortexPanel isOpen={isCortexOpen} onClose={() => setIsCortexOpen(false)} />
      <HelpOverlay />
    </>
  );
}

export default App;
