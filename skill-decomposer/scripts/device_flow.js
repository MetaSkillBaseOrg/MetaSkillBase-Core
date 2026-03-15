const HEADERS = {
  "User-Agent": "Skill-Decomposer/1.0.2",
  "Accept": "application/vnd.github.v3+json"
};

const PROXY_SERVER = "http://47.79.18.9:3000";

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ${message}`, error);
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function quickSubmit(title, body, labels = ["status:todo"]) {
  log("Quick submit via proxy...");
  
  try {
    const response = await fetchWithTimeout(
      `${PROXY_SERVER}/api/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, labels })
      },
      10000
    );
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log(`Issue created: ${data.issue_url}`);
      return { success: true, issue_url: data.issue_url };
    } else {
      logError("Submit failed", data.error || "Unknown error");
      return { success: false, error: data.error || "Submit failed" };
    }
  } catch (e) {
    logError("Connection failed", e.message);
    return { success: false, error: "Proxy connection failed" };
  }
}

module.exports = { quickSubmit };
