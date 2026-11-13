// Biometric Voting System - Core Client Application
// Cryptographic Terminal Management, Biometric Vector Simulation, and Live Auditing

let currentStep = 1;
let currentVoterData = null;
let currentAuthToken = null;
let selectedCandidateId = null;
let allVotersCache = [];
let allCandidatesCache = [];

let fpScanned = false;
let faceScanned = false;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  fetchElectionStatus();
  loadQuickVoterList();
  loadCandidateBallot();
});

// Tab Switcher
function switchTab(panelId, btnElement) {
  document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active-panel"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  
  document.getElementById(panelId).classList.add("active-panel");
  if (btnElement) btnElement.classList.add("active");

  // Load relevant data depending on tab
  if (panelId === "rosterView") loadVoterRoster();
  if (panelId === "ledgerView") loadLedgerData();
  if (panelId === "analyticsView") loadTallyResults();
  if (panelId === "securityAuditView") loadSecurityLogs();
}

// Fetch overall election state
async function fetchElectionStatus() {
  try {
    const res = await fetch("/api/election-status");
    const data = await res.json();
    if (data.election) {
      document.getElementById("boothCodeLabel").innerText = data.election.booth_code;
      document.getElementById("systemStatusLabel").innerText = `${data.election.status} & MERKLE ARMED`;
    }
  } catch (err) {
    console.error("Failed fetching election status", err);
  }
}

// Load quick voter badges for terminal testing
async function loadQuickVoterList() {
  try {
    const res = await fetch("/api/voters");
    const data = await res.json();
    allVotersCache = data.voters || [];
    
    const container = document.getElementById("quickVoterBadges");
    container.innerHTML = "";

    allVotersCache.forEach(voter => {
      const badge = document.createElement("button");
      badge.className = "btn btn-outline";
      badge.style.fontSize = "0.75rem";
      badge.style.padding = "0.25rem 0.6rem";
      
      const statusIcon = voter.has_voted ? "fa-circle-check" : "fa-circle";
      const statusColor = voter.has_voted ? "#10b981" : "#94a3b8";

      badge.innerHTML = `<i class="fa-solid ${statusIcon}" style="color:${statusColor}; font-size:0.6rem;"></i> ${voter.voter_id} - ${voter.full_name} (${voter.has_voted ? 'Voted' : 'Eligible'})`;
      badge.onclick = () => {
        document.getElementById("voterIdInput").value = voter.voter_id;
      };
      container.appendChild(badge);
    });
  } catch (err) {
    console.error("Failed loading quick voter list", err);
  }
}

function quickFillRandomVoter() {
  if (!allVotersCache.length) return;
  const unvoted = allVotersCache.filter(v => !v.has_voted);
  const target = unvoted.length ? unvoted[Math.floor(Math.random() * unvoted.length)] : allVotersCache[0];
  document.getElementById("voterIdInput").value = target.voter_id;
}

// ---------------- STAGE 1 -> STAGE 2 ---------------- //
function proceedToBiometrics() {
  const voterId = document.getElementById("voterIdInput").value.trim().toUpperCase();
  if (!voterId) {
    alert("Please enter a valid Voter Registration Number (EPIC ID).");
    return;
  }

  // Reset scanner states
  fpScanned = false;
  faceScanned = false;
  updateScannerVisuals();
  document.getElementById("bioFeedbackAlert").style.display = "none";

  setKioskStage(2);
}

function setKioskStage(stageNum) {
  currentStep = stageNum;
  document.querySelectorAll(".kiosk-stage").forEach(s => s.classList.remove("active"));
  document.getElementById(`stage${stageNum}`).classList.add("active");

  for (let i = 1; i <= 4; i++) {
    const item = document.getElementById(`stepIndicator${i}`);
    if (i < stageNum) {
      item.className = "step-item completed";
    } else if (i === stageNum) {
      item.className = "step-item active";
    } else {
      item.className = "step-item";
    }
  }
}

function resetKioskToStage1() {
  setKioskStage(1);
}

// ---------------- STAGE 2: BIOMETRICS SIMULATION ---------------- //
function simulateFingerprintScan() {
  const box = document.getElementById("fingerprintScannerBox");
  const text = document.getElementById("fpStatusText");
  
  box.classList.add("scanning");
  text.innerText = "Optical scanner capturing minutiae...";

  setTimeout(() => {
    box.classList.remove("scanning");
    box.classList.add("matched");
    text.innerText = "✓ Minutiae Pattern Extracted (SHA-256)";
    fpScanned = true;
  }, 1200);
}

function simulateFacialScan() {
  const box = document.getElementById("facialScannerBox");
  const text = document.getElementById("faceStatusText");
  
  box.classList.add("scanning");
  text.innerText = "Calibrating 68 facial nodal points...";

  setTimeout(() => {
    box.classList.remove("scanning");
    box.classList.add("matched");
    text.innerText = "✓ Vector Landmark Matched (99.1%)";
    faceScanned = true;
  }, 1400);
}

function updateScannerVisuals() {
  const fpBox = document.getElementById("fingerprintScannerBox");
  fpBox.className = "scan-box";
  document.getElementById("fpStatusText").innerText = "Click to place thumb";

  const faceBox = document.getElementById("facialScannerBox");
  faceBox.className = "scan-box";
  document.getElementById("faceStatusText").innerText = "Click to align sensor";
}

// Verify with backend
async function executeBiometricVerification() {
  const voterId = document.getElementById("voterIdInput").value.trim().toUpperCase();
  const alertBox = document.getElementById("bioFeedbackAlert");
  alertBox.style.display = "none";

  // If user hasn't clicked scanners, prompt quick simulation
  if (!fpScanned && !faceScanned) {
    alert("Please place thumb on the optical scanner or face sensor first to extract biometric vectors.");
    return;
  }

  // Look up expected deterministic sample for selected voter to demonstrate 100% genuine match
  const selectedVoter = allVotersCache.find(v => v.voter_id === voterId);
  const fpPayload = selectedVoter ? `BIO_FP_${selectedVoter.full_name.split(' ')[0].toUpperCase()}` : "BIO_FP_SAMPLE_UNREGISTERED";
  const facePayload = selectedVoter ? `BIO_FACE_${selectedVoter.full_name.split(' ')[0].toUpperCase()}` : "BIO_FACE_SAMPLE_UNREGISTERED";

  try {
    const res = await fetch("/api/verify-voter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voter_id: voterId,
        fingerprint_sample: fpPayload,
        face_sample: facePayload
      })
    });

    const result = await res.json();

    if (res.status === 403) {
      // DUPLICATE VOTING ATTEMPT DETECTED!
      alertBox.className = "alert-box alert-danger";
      alertBox.innerHTML = `
        <i class="fa-solid fa-ban" style="font-size: 1.25rem;"></i>
        <div>
          <strong>DUPLICATE VOTING VIOLATION PREVENTED:</strong><br>
          ${result.message}
          <div style="margin-top: 0.35rem; font-size: 0.75rem;">Security event logged to incident monitor with terminal fingerprint.</div>
        </div>
      `;
      alertBox.style.display = "flex";
      return;
    }

    if (!result.success) {
      alertBox.className = "alert-box alert-danger";
      alertBox.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.25rem;"></i>
        <div><strong>AUTHENTICATION FAILED:</strong> ${result.message}</div>
      `;
      alertBox.style.display = "flex";
      return;
    }

    // Success: authenticated
    currentVoterData = result.voter;
    currentAuthToken = result.token;

    // Populate stage 3 header
    document.getElementById("authVoterName").innerText = result.voter.full_name;
    document.getElementById("authVoterId").innerText = result.voter.voter_id;
    document.getElementById("authVoterConst").innerText = result.voter.constituency;

    setKioskStage(3);
  } catch (err) {
    console.error("Verification error", err);
    alert("Connection error contacting local biometric terminal server.");
  }
}

// ---------------- STAGE 3: BALLOT SELECTION & VOTING ---------------- //
async function loadCandidateBallot() {
  try {
    const res = await fetch("/api/candidates");
    const data = await res.json();
    allCandidatesCache = data.candidates || [];

    const container = document.getElementById("candidatesBallotContainer");
    container.innerHTML = "";

    allCandidatesCache.forEach((cand, idx) => {
      const row = document.createElement("div");
      row.className = "candidate-row";
      row.id = `candRow_${cand.id}`;
      row.innerHTML = `
        <div class="cand-left">
          <div class="cand-num">${idx + 1}</div>
          <div class="cand-symbol-box">
            <i class="fa-solid ${cand.symbol_icon}"></i>
          </div>
          <div class="cand-info">
            <h5>${cand.name}</h5>
            <p>${cand.party} • <em>${cand.symbol}</em></p>
          </div>
        </div>
        <button class="vote-action-btn" type="button">
          <i class="fa-solid fa-fingerprint"></i> SELECT
        </button>
      `;

      row.onclick = () => selectCandidate(cand.id);
      container.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading candidate ballot", err);
  }
}

function selectCandidate(candidateId) {
  selectedCandidateId = candidateId;
  document.querySelectorAll(".candidate-row").forEach(r => r.classList.remove("selected"));
  const row = document.getElementById(`candRow_${candidateId}`);
  if (row) row.classList.add("selected");
  
  const submitBtn = document.getElementById("btnSubmitVote");
  submitBtn.disabled = false;
  submitBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function submitBallot() {
  if (!selectedCandidateId || !currentVoterData || !currentAuthToken) {
    alert("Please select a candidate on the ballot unit.");
    return;
  }

  const submitBtn = document.getElementById("btnSubmitVote");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cryptographically Sealing Ballot...`;

  try {
    const res = await fetch("/api/cast-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voter_id: currentVoterData.voter_id,
        candidate_id: selectedCandidateId,
        token: currentAuthToken
      })
    });

    const result = await res.json();

    if (!result.success) {
      alert(`Ballot Error: ${result.message}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-check-to-slot"></i> Cast Ballot & Record to Ledger`;
      return;
    }

    // Success: Populate VVPAT slip
    const cand = allCandidatesCache.find(c => c.id === selectedCandidateId);
    document.getElementById("vvpatSlipNum").innerText = result.receipt.receipt_code;
    document.getElementById("vvpatTimestamp").innerText = result.receipt.timestamp;
    document.getElementById("vvpatBooth").innerText = result.receipt.booth;
    document.getElementById("vvpatCandidate").innerText = cand ? cand.name : "Selected Candidate";
    document.getElementById("vvpatParty").innerText = cand ? cand.party : "-";
    document.getElementById("vvpatBlockIndex").innerText = `#${result.receipt.block_index}`;
    document.getElementById("vvpatBlockHash").innerText = result.receipt.block_hash;

    // Refresh roster cache
    loadQuickVoterList();

    // Advance to VVPAT Stage
    setKioskStage(4);
  } catch (err) {
    console.error("Error submitting ballot", err);
    alert("Terminal failed to write vote to ledger.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-check-to-slot"></i> Cast Ballot & Record to Ledger`;
  }
}

function nextVoterKioskReset() {
  currentVoterData = null;
  currentAuthToken = null;
  selectedCandidateId = null;
  document.querySelectorAll(".candidate-row").forEach(r => r.classList.remove("selected"));
  setKioskStage(1);
  quickFillRandomVoter();
}

// ---------------- TAB 2: ELECTORAL ROLL ---------------- //
async function loadVoterRoster() {
  try {
    const res = await fetch("/api/voters");
    const data = await res.json();
    const tbody = document.getElementById("voterRosterTbody");
    tbody.innerHTML = "";

    (data.voters || []).forEach(v => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 700; color: #38bdf8;">${v.voter_id}</td>
        <td style="font-weight: 600;">${v.full_name}</td>
        <td>${v.dob}</td>
        <td>${v.gender}</td>
        <td>${v.constituency}</td>
        <td>${v.phone}</td>
        <td>
          <span class="status-tag ${v.has_voted ? 'status-success' : 'status-warning'}">
            ${v.has_voted ? 'BALLOT CAST' : 'ELIGIBLE TO VOTE'}
          </span>
        </td>
        <td>
          <button class="btn btn-outline" style="font-size: 0.72rem; padding: 0.25rem 0.6rem;" onclick="loadVoterIntoBooth('${v.voter_id}')">
            Load to Terminal
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed loading roster", err);
  }
}

function loadVoterIntoBooth(voterId) {
  document.getElementById("voterIdInput").value = voterId;
  switchTab("terminalView", document.querySelectorAll(".tab-btn")[0]);
}

// ---------------- TAB 3: MERKLE LEDGER ---------------- //
async function loadLedgerData() {
  try {
    const res = await fetch("/api/results");
    const data = await res.json();
    const tbody = document.getElementById("ledgerTableBody");
    tbody.innerHTML = "";

    const blocks = data.recent_ledger_blocks || [];
    if (!blocks.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding: 2rem;">No votes recorded in this session yet. Cast ballots to populate the cryptographic ledger.</td></tr>`;
      return;
    }

    blocks.forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:700; color:#10b981;">#${b.block_index}</td>
        <td style="font-size:0.75rem;">${b.timestamp}</td>
        <td><span class="hash-pill">${b.previous_hash.substring(0, 14)}...</span></td>
        <td><span class="hash-pill">${b.vote_receipt_hash.substring(0, 14)}...</span></td>
        <td>Candidate #${b.candidate_id}</td>
        <td>${b.booth_id}</td>
        <td><span class="hash-pill" style="color:#a855f7;">${b.current_hash.substring(0, 16)}...</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed loading ledger", err);
  }
}

async function verifyLedgerIntegrity() {
  const banner = document.getElementById("ledgerAuditStatusBanner");
  const text = document.getElementById("ledgerAuditStatusText");
  const feedback = document.getElementById("simulationFeedback");

  try {
    const res = await fetch("/api/verify-ledger");
    const result = await res.json();

    if (result.valid) {
      if (banner) {
        banner.className = "alert-box alert-success";
        text.innerText = `MERKLE AUDIT PASSED: ${result.blocks_checked} vote blocks verified. Hash chain unbroken. Zero tampering.`;
        banner.style.display = "flex";
      }
      if (feedback) {
        feedback.style.display = "block";
        feedback.innerHTML = `<span style="color:#10b981;">[AUDIT PASS] Checked ${result.blocks_checked} blocks. Cryptographic SHA-256 chain is 100% authentic.</span>`;
      }
    } else {
      if (banner) {
        banner.className = "alert-box alert-danger";
        text.innerText = `CRITICAL INTEGRITY BREACH: Tampering detected on Block #${result.tampered_block}! ${result.reason}`;
        banner.style.display = "flex";
      }
      if (feedback) {
        feedback.style.display = "block";
        feedback.innerHTML = `<span style="color:#f43f5e;">[TAMPER DETECTED] Block #${result.tampered_block} failed checksum verification!</span>`;
      }
    }
  } catch (err) {
    console.error("Error verifying ledger", err);
  }
}

// ---------------- TAB 4: RESULTS & TALLY ---------------- //
async function loadTallyResults() {
  try {
    const res = await fetch("/api/results");
    const data = await res.json();

    document.getElementById("statsTotalVoters").innerText = data.registered_voters;
    document.getElementById("statsTotalVoted").innerText = data.total_votes;
    document.getElementById("statsTurnoutPct").innerText = `${data.turnout_percentage}%`;

    const container = document.getElementById("candidateTallyContainer");
    container.innerHTML = "";

    (data.candidates || []).forEach(cand => {
      const card = document.createElement("div");
      card.className = "tally-card";
      card.innerHTML = `
        <div class="tally-meta">
          <div>
            <strong>${cand.name}</strong> <span style="font-size:0.8rem; color:#94a3b8;">(${cand.party})</span>
          </div>
          <div style="font-family: var(--terminal-font); font-weight:700;">
            ${cand.votes_count} votes (${cand.percentage}%)
          </div>
        </div>
        <div class="tally-bar-container">
          <div class="tally-bar-fill" style="width: ${cand.percentage}%"></div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed loading tally results", err);
  }
}

// ---------------- TAB 5: SECURITY AUDIT LOGS ---------------- //
async function loadSecurityLogs() {
  try {
    const res = await fetch("/api/security-logs");
    const data = await res.json();
    const tbody = document.getElementById("securityLogsTbody");
    tbody.innerHTML = "";

    (data.logs || []).forEach(log => {
      const tr = document.createElement("tr");
      let statusClass = "status-success";
      if (log.status === "SECURITY_ALERT" || log.status === "CRITICAL") statusClass = "status-alert";
      else if (log.status === "WARNING" || log.status === "FAILURE") statusClass = "status-warning";

      tr.innerHTML = `
        <td style="color:#94a3b8;">#${log.id}</td>
        <td style="font-size:0.75rem;">${log.created_at}</td>
        <td style="font-weight:600; color:#38bdf8;">${log.event_type}</td>
        <td>${log.description}</td>
        <td><code>${log.ip_address}</code></td>
        <td><span class="status-tag ${statusClass}">${log.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed loading security logs", err);
  }
}

// ---------------- SIMULATION & ATTACK TEST LAB ---------------- //
async function simulateDuplicateVoteAttack() {
  // First ensure there is at least one voted voter
  const votedVoter = allVotersCache.find(v => v.has_voted);
  const feedback = document.getElementById("simulationFeedback");
  feedback.style.display = "block";

  if (!votedVoter) {
    feedback.innerHTML = `<span style="color:#f59e0b;">[SETUP] Please cast 1 regular vote first so a voter is marked as 'VOTED', then re-run this attack simulation.</span>`;
    return;
  }

  feedback.innerHTML = `<span style="color:#38bdf8;">[ATTACK SIMULATION] Attempting duplicate vote replay with EPIC: ${votedVoter.voter_id}...</span>`;

  try {
    const res = await fetch("/api/verify-voter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voter_id: votedVoter.voter_id,
        fingerprint_sample: `BIO_FP_${votedVoter.full_name.split(' ')[0].toUpperCase()}`,
        face_sample: `BIO_FACE_${votedVoter.full_name.split(' ')[0].toUpperCase()}`
      })
    });

    const result = await res.json();
    if (res.status === 403) {
      feedback.innerHTML = `
        <span style="color:#f43f5e; font-weight:700;">[DEFENSE ACTIVATED - 403 FORBIDDEN]</span><br>
        Duplicate vote attack blocked! Voter ${votedVoter.voter_id} record flagged. Threat logged to security register.
      `;
    }
  } catch (err) {
    feedback.innerHTML = `<span style="color:#f43f5e;">Error running test: ${err.message}</span>`;
  }
}

async function simulateBiometricMismatchAttack() {
  const feedback = document.getElementById("simulationFeedback");
  feedback.style.display = "block";
  feedback.innerHTML = `<span style="color:#38bdf8;">[ATTACK SIMULATION] Presenting synthetic spoofed biometric vector to terminal...</span>`;

  try {
    const res = await fetch("/api/verify-voter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voter_id: "VTR-882901",
        fingerprint_sample: "SPOOFED_SYNTHETIC_LATENT_FP_FAKE",
        face_sample: "DEEPFAKE_FACIAL_MASK_VECTOR_FAKE"
      })
    });

    const result = await res.json();
    if (res.status === 401) {
      feedback.innerHTML = `
        <span style="color:#f59e0b; font-weight:700;">[SPOOF DETECTED - 401 UNAUTHORIZED]</span><br>
        Biometric confidence score: ${result.confidence}% (Threshold: 85%). Access denied.
      `;
    }
  } catch (err) {
    feedback.innerHTML = `<span style="color:#f43f5e;">Error running test: ${err.message}</span>`;
  }
}

async function simulateGhostVoterAttack() {
  const feedback = document.getElementById("simulationFeedback");
  feedback.style.display = "block";
  feedback.innerHTML = `<span style="color:#38bdf8;">[ATTACK SIMULATION] Infiltrating invalid/fabricated EPIC ID: VTR-999999...</span>`;

  try {
    const res = await fetch("/api/verify-voter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voter_id: "VTR-999999",
        fingerprint_sample: "ANY_FP",
        face_sample: "ANY_FACE"
      })
    });

    const result = await res.json();
    if (res.status === 404) {
      feedback.innerHTML = `
        <span style="color:#a855f7; font-weight:700;">[GHOST VOTER REJECTED - 404 NOT FOUND]</span><br>
        EPIC not found on electoral roll for this constituency. Entry rejected.
      `;
    }
  } catch (err) {
    feedback.innerHTML = `<span style="color:#f43f5e;">Error running test: ${err.message}</span>`;
  }
}

async function resetDemoState() {
  if (!confirm("Reset election session? This clears all votes, resets voter status to eligible, and purges test ledger.")) return;
  try {
    await fetch("/api/reset-demo", { method: "POST" });
    alert("System database reset to initial fresh election state.");
    window.location.reload();
  } catch (err) {
    alert("Failed to reset database.");
  }
}
