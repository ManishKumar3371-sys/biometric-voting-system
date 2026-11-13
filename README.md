# National Biometric Electronic Voting & Cryptographic Audit System (SEC-EVT)

An authentic, production-grade Biometric Electronic Voting System (EVM/VVPAT) concept implementing multi-modal biometric voter authentication, strict duplicate-voting prevention, zero-knowledge ballot anonymity, and an append-only Merkle cryptographic ledger.

---

## 🏛️ System Architecture & Security Principles

1. **Dual Multi-Modal Biometric Authentication**
   - Implements optical fingerprint and facial recognition vector checking.
   - Raw biometric data is never stored; irreversible SHA-256 minutiae vectors are hashed and cryptographically matched against the official electoral roll.
2. **Strict Duplicate Voting Elimination**
   - Each registered voter record is tied to an atomic franchise lock.
   - Re-attempting authentication with a previously voted EPIC ID or matching biometric triggers an immediate lockout (`403 FORBIDDEN - ALREADY_VOTED`) and logs a security incident.
3. **Decoupled Ballot Privacy (Zero-Knowledge)**
   - Ballots are cryptographically decoupled from voter identities to preserve secret ballot laws.
   - Voters receive a verifiable digital VVPAT slip containing a deterministic hash receipt that proves inclusion in the ledger without exposing their choice.
4. **Tamper-Evident Merkle Block Ledger**
   - Every cast ballot forms an immutable block containing `previous_hash`, `timestamp`, `vote_receipt_hash`, `booth_id`, and `current_hash`.
   - Built-in live integrity auditing verifies whether any block in the ledger has been modified or injected.
5. **Real-Time Security Incident Monitoring**
   - Real-time audit log captures spoofing attempts, invalid/ghost voter IDs, and double-voting infractions.

---

## 🚀 How to Run the Application

### 1. Activate the Virtual Environment & Launch Server
In your terminal (PowerShell or Command Prompt):
```powershell
cd C:\Users\MANISHKUMAR\OneDrive\Desktop\CyberSecurityLab
.\venv\Scripts\python.exe app.py
```

### 2. Access the Polling Terminal UI
Open your web browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🧪 Interactive Walkthrough & Testing Guide

### Scenario A: Normal Biometric Voting Flow
1. **Identify**: In the **Biometric Voting Booth** tab, pick one of the enrolled citizens (e.g., `VTR-882901 - Vikramaditya Sharma`) or click **"Pick Voter"**. Click **"Proceed to Dual Biometric Scan"**.
2. **Biometrics**: Click on the **Optical Fingerprint** or **Facial Recognition** scanner module to simulate sensor capture. Click **"Authenticate Biometrics"**.
3. **Secret Ballot**: Select your preferred candidate or NOTA on the Electronic Ballot Unit and click **"Cast Ballot & Record to Ledger"**.
4. **VVPAT Receipt**: Inspect the generated official VVPAT paper slip with Merkle block hash and verification token. Click **"Prepare Booth for Next Voter"**.

### Scenario B: Duplicate Voting Prevention Test
1. Re-enter the same Voter ID (`VTR-882901`) that just cast a ballot.
2. Click **Proceed** and **Authenticate Biometrics**.
3. The system blocks the attempt with **ACCESS DENIED (`403 Forbidden`)**, flagging an unauthorized duplicate voting attempt.
4. Switch to the **Security & Intrusion Logs** tab to inspect the logged `DUPLICATE_VOTE_ALERT`.

### Scenario C: Security Threat Simulator
In the right column sandbox:
- **Test Duplicate Vote**: Simulates replay attack against voted identity.
- **Test Spoofed Biometric**: Injects synthetic vectors (fails confidence threshold < 85%).
- **Test Ghost Voter ID**: Probes with unregistered EPIC (`VTR-999999`).
- **Audit Merkle Integrity**: Validates the SHA-256 chain across all blocks.
