use std::path::PathBuf;
use std::fs;
use std::error::Error;

// The standard name for the device file
const DEVICE_FILENAME: &str = "device.wvd";
const CLIENT_ID_FILENAME: &str = "client_id.bin";
const PRIVATE_KEY_FILENAME: &str = "private_key.pem";

#[derive(Debug, Clone)]
pub struct WidevineDevice {
    pub client_id: Vec<u8>,
    pub private_key: Vec<u8>,
}

impl WidevineDevice {
    pub fn load() -> Result<Self, Box<dyn Error + Send + Sync>> {
        // 1. Look for the 'cdm' folder in the current working directory
        let mut cdm_path = std::env::current_dir().map_err(|e| Box::new(e) as Box<dyn Error + Send + Sync>)?;
        cdm_path.push("cdm");

        // 2. Check for .wvd file (Placeholder for now, as parsing .wvd requires protobuf)
        let wvd_path = cdm_path.join(DEVICE_FILENAME);
        if wvd_path.exists() {
            println!("🔐 CDM: Found device.wvd at {:?}", wvd_path);
            // TODO: Implement WVD parsing (requires protobuf definition of WidevineDevice)
            // For now, we will return a dummy error saying we need the raw files
            // return Err("WVD parsing not yet implemented. Please extract to client_id.bin and private_key.pem".into());
        }

        // 3. Check for raw keys (client_id.bin and private_key.pem)
        let client_id_path = cdm_path.join(CLIENT_ID_FILENAME);
        let private_key_path = cdm_path.join(PRIVATE_KEY_FILENAME);

        if client_id_path.exists() && private_key_path.exists() {
            println!("🔐 CDM: Found raw keys.");
            let client_id = fs::read(client_id_path).map_err(|e| Box::new(e) as Box<dyn Error + Send + Sync>)?;
            let private_key = fs::read(private_key_path).map_err(|e| Box::new(e) as Box<dyn Error + Send + Sync>)?;
            
            return Ok(WidevineDevice {
                client_id,
                private_key,
            });
        }

        Err(Box::new(std::io::Error::new(std::io::ErrorKind::NotFound, "No Widevine Device found. Please place 'device.wvd' or 'client_id.bin'/'private_key.pem' in the 'cdm' folder.")))
    }
}
