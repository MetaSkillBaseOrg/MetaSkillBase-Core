const http = require('http');
const DEVICE_FLOW_CONFIG = {
  client_id: "Ov23linUVsAaVbPAcQYo",
  auth_url: "https://github.com/login/device",
  device_code_url: "https://github.com/login/device/code",
  access_token_url: "https://github.com/login/device/access_token",
  repo_owner: "MetaSkillBaseOrg",
  repo_name: "MetaSkillBase-Core",
  issue_api_url: "https://api.github.com/repos/MetaSkillBaseOrg/MetaSkillBase-Core/issues"
};

const HEADERS = {
  "User-Agent": "Skill-Decomposer/1.0.2",
  "Accept": "application/vnd.github.v3+json"
};

// 内存存储（保持进程存活）
let flowState = {
  deviceCode: null,
  accessToken: null,
  requirementName: '',
  issueBody: '',
  result: null
};

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 启动 Device Flow
async function startDeviceFlow(req) {
  console.log('[DeviceFlow] Generating device code...');
  const response = await fetchWithTimeout(DEVICE_FLOW_CONFIG.device_code_url, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
    body: `client_id=${DEVICE_FLOW_CONFIG.client_id}&scope=public_repo`
  });
  const data = await response.json();
  
  flowState.deviceCode = data.device_code;
  flowState.result = null;
  
  return {
    user_code: data.user_code,
    verification_uri: data.verification_uri
  };
}

// 轮询授权状态
async function pollAuthorization() {
  if (!flowState.deviceCode) {
    return { error: 'No device code. Start flow first.' };
  }
  
  const response = await fetchWithTimeout(DEVICE_FLOW_CONFIG.access_token_url, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
    body: `client_id=${DEVICE_FLOW_CONFIG.client_id}&device_code=${flowState.deviceCode}&grant_type=urn:ietf:params:oauth:grant-type:device_code`
  });
  
  const data = await response.json();
  
  if (data.access_token) {
    flowState.accessToken = data.access_token;
    return { authorized: true };
  } else if (data.error === 'authorization_pending') {
    return { authorized: false };
  } else {
    return { error: data.error };
  }
}

// 创建 Issue
async function createIssue(title, body, labels) {
  if (!flowState.accessToken) {
    return { error: 'Not authorized' };
  }
  
  const response = await fetchWithTimeout(DEVICE_FLOW_CONFIG.issue_api_url, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Authorization": `token ${flowState.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, body, labels })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    flowState.result = { issue_url: data.html_url, number: data.number };
    return { success: true, issue_url: data.html_url };
  } else {
    return { success: false, error: data.message };
  }
}

// HTTP 服务器
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:3456`);
  
  try {
    if (url.pathname === '/start' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { requirementName, issueBody } = JSON.parse(body);
      flowState.requirementName = requirementName;
      flowState.issueBody = issueBody;
      
      const result = await startDeviceFlow();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    }
    else if (url.pathname === '/poll' && req.method === 'GET') {
      const result = await pollAuthorization();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    }
    else if (url.pathname === '/submit' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { title, body: issueBody, labels } = JSON.parse(body);
      
      if (!flowState.accessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not authorized' }));
        return;
      }
      
      const result = await createIssue(title, issueBody || flowState.issueBody, labels);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    }
    else if (url.pathname === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        hasDeviceCode: !!flowState.deviceCode,
        hasAccessToken: !!flowState.accessToken,
        result: flowState.result
      }));
    }
    else if (url.pathname === '/reset' && req.method === 'POST') {
      flowState = { deviceCode: null, accessToken: null, requirementName: '', issueBody: '', result: null };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (e) {
    console.error('[Error]', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

const PORT = process.argv[2] || 3456;
server.listen(PORT, () => {
  console.log(`[DeviceFlow Server] Running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /start - Start device flow, body: {requirementName, issueBody}');
  console.log('  GET  /poll   - Poll authorization status');
  console.log('  POST /submit - Create issue, body: {title, body, labels}');
  console.log('  GET  /status - Check status');
  console.log('  POST /reset  - Reset state');
});
