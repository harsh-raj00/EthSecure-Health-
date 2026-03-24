/**
 * IPFS Storage Utility - EthSecure Health
 * 
 * Handles encryption/decryption of medical records and
 * upload/retrieval from the IPFS network via Pinata API.
 * 
 * Security Model:
 *   - Data is encrypted CLIENT-SIDE using AES-256 before leaving the browser.
 *   - Encrypted blobs are uploaded to IPFS (decentralized, content-addressed).
 *   - Even if the IPFS CID is publicly known, data is unreadable without the key.
 */

import CryptoJS from 'crypto-js';
import axios from 'axios';

// ─── Configuration ──────────────────────────────────────────────
// Replace with your Pinata API keys from https://app.pinata.cloud
const PINATA_API_KEY     = "YOUR_PINATA_API_KEY";
const PINATA_SECRET_KEY  = "YOUR_PINATA_SECRET_KEY";
const PINATA_UPLOAD_URL  = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const IPFS_GATEWAY_URL   = "https://gateway.pinata.cloud/ipfs";

// ─── Encrypt & Upload ───────────────────────────────────────────

/**
 * Encrypts medical data locally and uploads it to IPFS via Pinata.
 * 
 * @param {Object|string} fileOrData - The medical data to store (JSON object or raw string).
 * @param {string} secretKey         - The patient's chosen secret encryption key (AES-256).
 * @returns {Promise<string>}        - The IPFS CID (Content Identifier) of the uploaded file.
 * 
 * @example
 *   const cid = await encryptAndUpload({ bloodType: "O+", report: "Normal" }, "mySecretKey123");
 *   // Returns: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
 */
export const encryptAndUpload = async (fileOrData, secretKey) => {
    // Step 1: Serialize the data to a string
    const stringData = typeof fileOrData === 'string' ? fileOrData : JSON.stringify(fileOrData);

    // Step 2: Encrypt using AES-256 (symmetric encryption)
    const encryptedData = CryptoJS.AES.encrypt(stringData, secretKey).toString();

    // Step 3: Create a Blob and FormData for Pinata upload
    const blob = new Blob([encryptedData], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'medical_record.enc');

    // Step 4: Upload encrypted blob to IPFS via Pinata API
    const res = await axios.post(PINATA_UPLOAD_URL, formData, {
        maxBodyLength: Infinity,
        headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_KEY,
        }
    });

    // Step 5: Return the IPFS CID (Content Identifier)
    console.log(`✅ Uploaded to IPFS: ${res.data.IpfsHash}`);
    return res.data.IpfsHash;
};

// ─── Retrieve & Decrypt ─────────────────────────────────────────

/**
 * Retrieves encrypted data from IPFS and decrypts it locally.
 * 
 * @param {string} ipfsHash  - The CID (Content Identifier) of the stored data.
 * @param {string} secretKey - The patient's secret decryption key (must match encryption key).
 * @returns {Promise<Object|string>} - The original decrypted data.
 * 
 * @example
 *   const data = await retrieveAndDecrypt("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", "mySecretKey123");
 *   // Returns: { bloodType: "O+", report: "Normal" }
 */
export const retrieveAndDecrypt = async (ipfsHash, secretKey) => {
    // Step 1: Fetch encrypted blob from IPFS gateway
    const res = await axios.get(`${IPFS_GATEWAY_URL}/${ipfsHash}`);
    const encryptedData = res.data;

    // Step 2: Decrypt using the same AES-256 key
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

    // Step 3: Parse JSON if possible, otherwise return raw string
    try {
        return JSON.parse(decryptedData);
    } catch {
        return decryptedData;
    }
};
