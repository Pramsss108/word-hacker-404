use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::error::Error;

// Widevine System ID (The "Keyhole" we are looking for)
const WIDEVINE_SYSTEM_ID: &str = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";

#[derive(Debug, Clone)]
pub struct DrmInfo {
    pub pssh: String,
    pub kid: Option<String>, // Key ID
}

pub fn extract_pssh_from_mpd(mpd_xml: &str) -> Result<DrmInfo, Box<dyn Error>> {
    let mut reader = Reader::from_str(mpd_xml);
    reader.trim_text(true);

    let mut buf = Vec::new();
    let mut pssh = String::new();
    let mut kid = None;
    let mut in_content_protection = false;
    let mut is_widevine = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"ContentProtection" {
                    in_content_protection = true;
                    is_widevine = false; // Reset

                    // Check attributes for SchemeIdUri
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"schemeIdUri" {
                                let val = String::from_utf8_lossy(&a.value).to_lowercase();
                                if val.contains(WIDEVINE_SYSTEM_ID) {
                                    is_widevine = true;
                                }
                            }
                            // Sometimes KID is in the attributes (cenc:default_KID)
                            if a.key.as_ref() == b"cenc:default_KID" {
                                kid = Some(String::from_utf8_lossy(&a.value).to_string());
                            }
                        }
                    }
                } else if e.name().as_ref() == b"cenc:pssh" && in_content_protection && is_widevine {
                    // This is the PSSH node inside a Widevine ContentProtection
                    // We need to read the text content next
                }
            }
            Ok(Event::Text(e)) => {
                if in_content_protection && is_widevine {
                    // If we are inside a Widevine node, this text is likely the PSSH
                    let text = e.unescape()?.into_owned();
                    if !text.trim().is_empty() {
                        pssh = text.trim().to_string();
                    }
                }
            }
            Ok(Event::End(e)) => {
                if e.name().as_ref() == b"ContentProtection" {
                    in_content_protection = false;
                    is_widevine = false;
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(Box::new(e)),
            _ => (),
        }
        buf.clear();
    }

    if !pssh.is_empty() {
        Ok(DrmInfo { pssh, kid })
    } else {
        Err("No Widevine PSSH found in MPD".into())
    }
}
