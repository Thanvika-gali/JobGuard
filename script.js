const form = document.getElementById("jobForm");
const inputCard = document.getElementById("inputCard");
const resultsEl = document.getElementById("results");
const flagChecks = document.getElementById("flagChecks");
const analyzeBtn = document.getElementById("analyzeBtn");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const previewRisk = document.getElementById("previewRisk");
const liveFlagCount = document.getElementById("liveFlagCount");
const draftStatus = document.getElementById("draftStatus");
const historyCount = document.getElementById("historyCount");
const historyList = document.getElementById("historyList");
const descriptionEl = document.getElementById("description");
const descriptionCount = document.getElementById("descriptionCount");
const descriptionHint = document.getElementById("descriptionHint");
const descriptionQuality = document.getElementById("descriptionQuality");
const descriptionAdvice = document.getElementById("descriptionAdvice");
const emailAdviceTitle = document.getElementById("emailAdviceTitle");
const emailAdviceText = document.getElementById("emailAdviceText");
const sourceAdviceTitle = document.getElementById("sourceAdviceTitle");
const sourceAdviceText = document.getElementById("sourceAdviceText");

const draftKey = "jobguard-draft-v2";
const themeKey = "jobguard-theme";
const historyKey = "jobguard-history";
const fields = ["jobTitle", "company", "salary", "email", "description", "source", "experience"];
const maxHistoryItems = 5;

const sampleJobs = {
  suspicious: {
    jobTitle: "Remote Data Entry Executive",
    company: "",
    salary: "Rs 85,000/month",
    email: "jobofferdesk.hr@gmail.com",
    description: "Urgent hiring. No experience required. Work from home and earn up to Rs 85,000 monthly. Limited slots. Registration fee required before onboarding. WhatsApp us now for immediate joining.",
    source: "whatsapp",
    experience: "any",
    flags: ["upfront_payment", "gmail_email", "urgency", "work_from_home", "no_company_info", "no_interview"]
  },
  legit: {
    jobTitle: "Frontend Engineer",
    company: "Northstar Labs",
    salary: "Rs 14,00,000/year",
    email: "careers@northstarlabs.com",
    description: "Northstar Labs is hiring a frontend engineer to build internal analytics dashboards. Candidates should have 3+ years of React experience, strong TypeScript fundamentals, and experience working with product managers. Interview process includes recruiter screening, technical round, and team discussion.",
    source: "linkedin",
    experience: "mid",
    flags: []
  }
};

function getFormData() {
  const data = {};
  fields.forEach((field) => {
    data[field] = document.getElementById(field).value.trim();
  });
  data.flags = getCheckedFlags();
  return data;
}

function setFormData(data) {
  fields.forEach((field) => {
    document.getElementById(field).value = data[field] || "";
  });
  const selected = new Set(data.flags || []);
  flagChecks.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(input.value);
    syncCheckItem(input);
  });
  updateLiveState();
}

function syncCheckItem(input) {
  input.closest(".check-item").classList.toggle("checked", input.checked);
}

function getCheckedFlags() {
  return [...flagChecks.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function getSalaryRiskScore(salary) {
  if (!salary) return 0;
  const s = salary.toLowerCase();
  const nums = salary.match(/[\d,]+/g);
  const primary = nums ? parseInt(nums[0].replace(/,/g, ""), 10) : 0;
  if (/unlimited|uncapped|easy money|earn up to/.test(s)) return 85;
  if (/(rs|inr|lakh|lac)/.test(s)) {
    if ((s.includes("month") || s.includes("/mo")) && primary > 150000) return 90;
    if ((s.includes("day") || s.includes("/day")) && primary > 5000) return 82;
    if ((s.includes("year") || s.includes("/yr")) && primary > 5000000) return 55;
  }
  if ((s.includes("$") || s.includes("usd")) && (s.includes("month") || s.includes("/mo")) && primary > 15000) return 90;
  return 0;
}

function getEmailRisk(email) {
  if (!email) return 0;
  const freeProviders = ["gmail", "yahoo", "hotmail", "outlook", "rediffmail", "ymail", "mail.com", "aol"];
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!domain || !domain.includes(".")) return 85;
  if (freeProviders.some((provider) => domain.includes(provider))) return 75;
  return 0;
}

function getDescRisk(desc) {
  if (!desc) return 0;
  const d = desc.toLowerCase();
  const redPhrases = [
    ["no experience required", 18], ["no experience needed", 18],
    ["easy money", 28], ["work from home", 12],
    ["earn up to", 24], ["registration fee", 40],
    ["processing fee", 40], ["training fee", 35],
    ["security deposit", 35], ["limited slots", 18],
    ["act now", 15], ["urgent hiring", 12],
    ["guaranteed income", 30], ["100% placement", 25],
    ["immediate joining", 12], ["daily payout", 18],
    ["simple task", 14], ["click links", 24],
    ["like and share", 24], ["crypto", 24],
    ["investment", 20], ["whatsapp us", 18], ["telegram", 16]
  ];

  let score = 0;
  redPhrases.forEach(([phrase, points]) => {
    if (d.includes(phrase)) score += points;
  });
  const grammarErrors = (desc.match(/\b(recieve|freind|plz|kindly revert|do needful|u r)\b/gi) || []).length;
  score += grammarErrors * 10;
  if (desc.length < 120) score += 10;
  return Math.min(score, 100);
}

function getSourceRisk(source) {
  const riskMap = {
    whatsapp: 80,
    sms: 70,
    email: 50,
    other: 40,
    indeed: 15,
    linkedin: 10,
    naukri: 10,
    website: 5
  };
  return riskMap[source] ?? 25;
}

function computeRisk(data = getFormData()) {
  const salaryScore = getSalaryRiskScore(data.salary);
  const emailScore = getEmailRisk(data.email);
  const descScore = getDescRisk(data.description);
  const sourceScore = getSourceRisk(data.source);
  const flagScore = Math.min((data.flags || []).length * 18, 100);
  let infoPenalty = 0;
  if (!data.jobTitle) infoPenalty += 10;
  if (!data.company) infoPenalty += 15;
  if (!data.description) infoPenalty += 5;
  if (!data.experience || data.experience === "any") infoPenalty += 8;

  const riskScore = Math.min(Math.round(
    (salaryScore * 0.2) +
    (emailScore * 0.15) +
    (descScore * 0.25) +
    (sourceScore * 0.15) +
    (flagScore * 0.35) +
    (infoPenalty * 0.1)
  ), 100);

  return { riskScore, salaryScore, emailScore, descScore, sourceScore, flagScore };
}

function getRiskLabel(score) {
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function metricColor(score) {
  if (score >= 60) return "var(--danger)";
  if (score >= 30) return "var(--warning)";
  return "var(--safe)";
}

function updateDescriptionMeta() {
  const length = descriptionEl.value.trim().length;
  descriptionCount.textContent = `${length} characters`;
  if (length < 120) {
    descriptionHint.textContent = "Short descriptions are harder to verify.";
    descriptionQuality.textContent = "Needs more detail";
    descriptionAdvice.textContent = "Add recruiter process, company details, and role responsibilities.";
  } else if (length < 250) {
    descriptionHint.textContent = "Some detail is present, but more specifics would help.";
    descriptionQuality.textContent = "Moderate detail";
    descriptionAdvice.textContent = "Look for specific responsibilities, interview steps, and company identity.";
  } else {
    descriptionHint.textContent = "Description length looks reasonable. Check quality, not just quantity.";
    descriptionQuality.textContent = "Detailed";
    descriptionAdvice.textContent = "Now focus on whether the content is specific, realistic, and consistent.";
  }
}

function updateAdvisories(data = getFormData()) {
  const emailRisk = getEmailRisk(data.email);
  if (!data.email) {
    emailAdviceTitle.textContent = "No email added";
    emailAdviceText.textContent = "A corporate domain usually lowers impersonation risk.";
  } else if (emailRisk > 50) {
    emailAdviceTitle.textContent = "Free email provider";
    emailAdviceText.textContent = "Treat Gmail, Yahoo, or malformed domains as a stronger warning sign.";
  } else {
    emailAdviceTitle.textContent = "Corporate-looking email";
    emailAdviceText.textContent = "Still verify the company, but the email format is less suspicious.";
  }

  const sourceRisk = getSourceRisk(data.source);
  if (!data.source) {
    sourceAdviceTitle.textContent = "No source selected";
    sourceAdviceText.textContent = "Unofficial channels like WhatsApp and SMS are much riskier.";
  } else if (sourceRisk >= 60) {
    sourceAdviceTitle.textContent = "High-risk channel";
    sourceAdviceText.textContent = "Cross-check the role on the company's official careers page before replying.";
  } else {
    sourceAdviceTitle.textContent = "Lower-risk channel";
    sourceAdviceText.textContent = "A known platform helps, but it does not guarantee legitimacy.";
  }
}

function updateLiveState() {
  const data = getFormData();
  liveFlagCount.textContent = String(data.flags.length);
  previewRisk.textContent = getRiskLabel(computeRisk(data).riskScore);
  updateDescriptionMeta();
  updateAdvisories(data);
}

function saveDraft(showStatus = true) {
  localStorage.setItem(draftKey, JSON.stringify(getFormData()));
  if (showStatus) draftStatus.textContent = "Draft saved locally";
}

function loadDraft() {
  const saved = localStorage.getItem(draftKey);
  if (!saved) return;
  try {
    setFormData(JSON.parse(saved));
    draftStatus.textContent = "Draft restored";
  } catch {
    localStorage.removeItem(draftKey);
  }
}

function clearDraft() {
  localStorage.removeItem(draftKey);
  form.reset();
  flagChecks.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
    syncCheckItem(input);
  });
  resultsEl.style.display = "none";
  resultsEl.innerHTML = "";
  inputCard.style.display = "block";
  draftStatus.textContent = "Draft cleared";
  updateLiveState();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey) || "[]");
  } catch {
    return [];
  }
}

function setHistory(history) {
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, maxHistoryItems)));
}

function updateHistoryUI() {
  const history = getHistory();
  historyCount.textContent = String(history.length);
  if (!history.length) {
    historyList.innerHTML = '<p class="empty-state">No saved analysis yet.</p>';
    return;
  }

  historyList.innerHTML = history.map((item) => `
    <article class="history-item">
      <div class="history-head">
        <strong>${item.company || "Unknown company"}</strong>
        <span class="history-score">${item.score}/100</span>
      </div>
      <span class="history-meta">${item.verdict}</span>
      <p class="empty-state">${item.title || "Untitled role"} | ${item.date}</p>
    </article>
  `).join("");
}

function pushHistory(data, score, verdict) {
  const history = getHistory();
  history.unshift({
    title: data.jobTitle || "Untitled role",
    company: data.company || "Unknown company",
    score,
    verdict,
    date: new Date().toLocaleString()
  });
  setHistory(history);
  updateHistoryUI();
}

function setTheme(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
  localStorage.setItem(themeKey, theme);
  themeIcon.textContent = theme === "dark" ? "Sun" : "Moon";
}

function loadTheme() {
  const saved = localStorage.getItem(themeKey);
  setTheme(saved === "dark" ? "dark" : "light");
}

function buildFlags(data, scores) {
  const flags = [];
  const selected = new Set(data.flags);

  if (selected.has("upfront_payment")) flags.push({ title: "Upfront payment requested", detail: "Real employers do not ask candidates to pay registration, training, or processing fees.", severity: "high" });
  if (selected.has("personal_docs")) flags.push({ title: "Sensitive documents requested too early", detail: "Sharing identity documents before a verified interview can expose you to identity theft.", severity: "high" });
  if (selected.has("no_interview")) flags.push({ title: "No interview or assessment", detail: "Immediate hiring without screening is a common scam pattern.", severity: "high" });
  if (selected.has("too_good")) flags.push({ title: "Compensation looks unrealistic", detail: "Salary claims far above market level should be checked against comparable roles.", severity: "high" });
  if (selected.has("gmail_email")) flags.push({ title: "Free email provider used", detail: "Recruiters using Gmail or Yahoo instead of a company domain are harder to verify.", severity: "high" });
  if (selected.has("work_from_home")) flags.push({ title: "High-pay remote shortcut pitch", detail: "Very high pay for simple remote work is one of the most common fake-job hooks.", severity: "medium" });
  if (selected.has("urgency")) flags.push({ title: "Artificial urgency", detail: "Pressure tactics reduce the time available for verification and push rushed decisions.", severity: "medium" });
  if (selected.has("vague_role")) flags.push({ title: "Role details are vague", detail: "Legitimate postings usually describe responsibilities, team context, and expectations clearly.", severity: "medium" });
  if (selected.has("poor_grammar")) flags.push({ title: "Language quality is poor", detail: "Bad grammar alone is not proof, but it raises concern when combined with other signals.", severity: "medium" });
  if (selected.has("no_company_info")) flags.push({ title: "Company is hard to verify", detail: "No website, public profile, or business identity makes the offer materially riskier.", severity: "high" });

  if (scores.emailScore > 50) flags.push({ title: "Email domain risk", detail: `The recruiter email "${data.email}" does not look like a normal corporate hiring address.`, severity: "high" });
  if (scores.salaryScore > 50) flags.push({ title: "Salary anomaly detected", detail: `The stated salary "${data.salary}" looks unusually high for a standard hiring flow.`, severity: "medium" });
  if (scores.descScore > 50) flags.push({ title: "Suspicious wording in description", detail: "The job text contains phrases commonly seen in scam postings.", severity: "medium" });
  if (scores.sourceScore > 60) flags.push({ title: "Source channel is high risk", detail: `Offers arriving through ${data.source || "an unknown source"} are more likely to be fraudulent than verified company channels.`, severity: "high" });
  if (!data.company) flags.push({ title: "Company name missing", detail: "Without a company identity, independent verification is much harder.", severity: "medium" });

  return flags
    .filter((flag, index, arr) => arr.findIndex((entry) => entry.title === flag.title) === index)
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]));
}

function buildReportText(data, score, verdict, flags) {
  const issues = flags.length
    ? flags.map((flag) => `- ${flag.title}: ${flag.detail}`).join("\n")
    : "- No major issues detected from the current inputs.";
  return [
    "JobGuard report",
    `Role: ${data.jobTitle || "Not provided"}`,
    `Company: ${data.company || "Not provided"}`,
    `Risk score: ${score}/100`,
    `Verdict: ${verdict}`,
    "",
    "Detected issues:",
    issues
  ].join("\n");
}

function renderMetric(title, score, text, id) {
  const color = metricColor(score);
  return `
    <article class="metric-card">
      <span class="metric-label">${title}</span>
      <div class="metric-bar-track"><div class="metric-bar-fill" id="${id}" style="background:${color}"></div></div>
      <div class="metric-value" style="color:${color}">${getRiskLabel(score)}</div>
      <p class="metric-desc">${text}</p>
    </article>
  `;
}

function analyze() {
  const data = getFormData();
  const scores = computeRisk(data);
  const flags = buildFlags(data, scores);
  const verdictClass = scores.riskScore >= 60 ? "danger" : scores.riskScore >= 30 ? "warning" : "safe";
  const verdictTitle = scores.riskScore >= 60 ? "Likely fraudulent" : scores.riskScore >= 30 ? "Suspicious - verify" : "Appears relatively safe";
  const verdictText = scores.riskScore >= 60
    ? "Multiple strong scam signals are present. Stop and verify the company independently before replying."
    : scores.riskScore >= 30
      ? "There are several concerns here. Validate the recruiter, hiring process, and company identity before proceeding."
      : "This looks lower risk based on the current inputs, but standard verification is still necessary.";
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (scores.riskScore / 100) * circumference;
  const reportText = buildReportText(data, scores.riskScore, verdictTitle, flags);

  analyzeBtn.disabled = true;
  analyzeBtn.classList.add("loading");
  analyzeBtn.querySelector(".btn-text").textContent = "Analyzing...";

  window.setTimeout(() => {
    resultsEl.innerHTML = `
      <section class="verdict-card ${verdictClass}">
        <div class="verdict-row">
          <div class="verdict-copy">
            <p class="eyebrow">Result</p>
            <h3>${verdictTitle}</h3>
            <p>${verdictText}</p>
          </div>
          <div class="score-ring">
            <svg viewBox="0 0 92 92" width="92" height="92">
              <circle cx="46" cy="46" r="34" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="8"></circle>
              <circle cx="46" cy="46" r="34" fill="none" stroke="${metricColor(scores.riskScore)}" stroke-width="8"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"></circle>
            </svg>
            <div class="score-num">${scores.riskScore}</div>
          </div>
        </div>
      </section>

      <div class="summary-grid">
        <article class="summary-card">
          <span class="mini-label">Manual flags</span>
          <strong>${data.flags.length}</strong>
          <p class="metric-desc">Warning signs selected by the user.</p>
        </article>
        <article class="summary-card">
          <span class="mini-label">Source</span>
          <strong>${data.source || "Unknown"}</strong>
          <p class="metric-desc">Risk changes significantly based on how the offer reached you.</p>
        </article>
        <article class="summary-card">
          <span class="mini-label">Contact</span>
          <strong>${data.email || "Not provided"}</strong>
          <p class="metric-desc">Corporate-looking domains lower recruiter impersonation risk.</p>
        </article>
      </div>

      <div class="section-head">
        <h4>Risk breakdown</h4>
      </div>
      <div class="metrics-grid">
        ${renderMetric("Description risk", scores.descScore, "Suspicious wording, missing specifics, and low detail increase risk.", "metric1")}
        ${renderMetric("Source channel risk", scores.sourceScore, "Unofficial channels like WhatsApp and SMS are materially riskier.", "metric2")}
        ${renderMetric("Manual flags", scores.flagScore, "Each checked red flag contributes to the overall risk score.", "metric3")}
        ${renderMetric("Email risk", scores.emailScore, "Free mail providers or malformed domains increase impersonation risk.", "metric4")}
      </div>

      <div class="section-head">
        <h4>Detected issues (${flags.length})</h4>
      </div>
      ${flags.length
        ? `<div class="flags-list">${flags.map((flag) => `
          <article class="flag-item">
            <span class="flag-dot ${flag.severity}"></span>
            <div>
              <strong>${flag.title}</strong>
              <p class="flag-detail">${flag.detail}</p>
            </div>
            <span class="flag-severity ${flag.severity}">${flag.severity}</span>
          </article>
        `).join("")}</div>`
        : '<div class="empty-block">No major red flags were detected from the current inputs.</div>'}

      <div class="guidance-grid">
        <section class="recs-card">
          <div class="section-head">
            <h4>What to do next</h4>
          </div>
          <div class="rec-item"><p class="rec-text">Verify the company website, LinkedIn page, and legal business identity before responding further.</p></div>
          <div class="rec-item"><p class="rec-text">Never pay any fee for registration, onboarding, training, equipment, or background checks.</p></div>
          <div class="rec-item"><p class="rec-text">Do not share Aadhaar, PAN, passport, bank details, or OTPs until the employer is verified.</p></div>
          <div class="rec-item"><p class="rec-text">Check whether the role also appears on the official company careers page.</p></div>
        </section>
        <section class="recs-card">
          <div class="section-head">
            <h4>Shareable summary</h4>
          </div>
          <div class="copy-row">
            <div>
              <p class="copy-text">Copy a plain-text report for notes, email, or escalation.</p>
            </div>
            <button type="button" class="copy-btn" id="copyReportBtn">Copy report</button>
          </div>
          <div class="empty-block">
            Keep a record if the recruiter pressures you, asks for money, or avoids verifiable company channels.
          </div>
        </section>
      </div>
    `;

    resultsEl.style.display = "block";
    inputCard.style.display = "block";
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });

    [["metric1", scores.descScore], ["metric2", scores.sourceScore], ["metric3", scores.flagScore], ["metric4", scores.emailScore]]
      .forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.style.width = `${value}%`;
      });

    document.getElementById("copyReportBtn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(reportText);
        draftStatus.textContent = "Report copied";
      } catch {
        draftStatus.textContent = "Copy failed";
      }
    });

    pushHistory(data, scores.riskScore, verdictTitle);
    saveDraft(false);
    analyzeBtn.disabled = false;
    analyzeBtn.classList.remove("loading");
    analyzeBtn.querySelector(".btn-text").textContent = "Analyze job offer";
  }, 650);
}

flagChecks.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
  syncCheckItem(target);
  updateLiveState();
});

form.addEventListener("input", () => {
  updateLiveState();
  saveDraft(false);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  analyze();
});

document.getElementById("saveDraftBtn").addEventListener("click", () => saveDraft(true));
document.getElementById("clearDraftBtn").addEventListener("click", clearDraft);
document.getElementById("resetFormBtn").addEventListener("click", clearDraft);
document.getElementById("loadSuspiciousBtn").addEventListener("click", () => {
  setFormData(sampleJobs.suspicious);
  saveDraft(true);
});
document.getElementById("loadLegitBtn").addEventListener("click", () => {
  setFormData(sampleJobs.legit);
  saveDraft(true);
});
themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
  setTheme(nextTheme);
});

loadTheme();
loadDraft();
updateLiveState();
updateHistoryUI();
