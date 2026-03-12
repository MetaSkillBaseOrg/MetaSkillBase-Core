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
  "User-Agent": "Skill-Decomposer/1.0.1 (MetaSkillBaseOrg)",
  "Accept": "application/vnd.github.v3+json"
};

let storedDeviceCode = null;
let storedAccessToken = null;

// Step 1: 生成 Device Code
async function generateDeviceCode() {
  const response = await fetch(DEVICE_FLOW_CONFIG.device_code_url, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `client_id=${DEVICE_FLOW_CONFIG.client_id}&scope=public_repo`
  });
  
  const data = await response.json();
  storedDeviceCode = data.device_code;
  
  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri,
    expires_in: data.expires_in,
    interval: data.interval
  };
}

// Step 2: 轮询授权状态
async function pollAuthorization(deviceCode, interval = 5, timeout = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
    
    try {
      const response = await fetch(DEVICE_FLOW_CONFIG.access_token_url, {
        method: "POST",
        headers: {
          ...HEADERS,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `client_id=${DEVICE_FLOW_CONFIG.client_id}&device_code=${deviceCode}&grant_type=urn:ietf:params:oauth:grant-type:device_code`
      });
      
      const data = await response.json();
      
      if (data.access_token) {
        storedAccessToken = data.access_token;
        return { success: true, access_token: data.access_token };
      } else if (data.error === "expired_token") {
        return { success: false, error: "Authorization expired" };
      } else if (data.error === "authorization_pending") {
        continue;
      } else if (data.error === "slow_down") {
        interval = Math.min(interval * 2, 60);
      }
    } catch (e) {
      console.error("Polling error:", e);
    }
  }
  
  return { success: false, error: "Authorization timeout" };
}

// Step 3: 创建 GitHub Issue
async function createGitHubIssue(title, body, labels = ["status:todo"]) {
  if (!storedAccessToken) {
    return { success: false, error: "No access token available" };
  }
  
  const response = await fetch(DEVICE_FLOW_CONFIG.issue_api_url, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Authorization": `token ${storedAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: title,
      body: body,
      labels: labels
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    return { 
      success: true, 
      issue_id: data.number, 
      issue_url: data.html_url 
    };
  } else {
    return { success: false, error: data.message };
  }
}

// 用户说 done 时调用
async function continueAfterAuthorization(requirementName, issueBody) {
  if (!storedDeviceCode) {
    return { success: false, error: "No device code. Please run submit first." };
  }
  
  const pollResult = await pollAuthorization(storedDeviceCode);
  
  if (!pollResult.success) {
    return { success: false, error: pollResult.error };
  }
  
  const title = `Demand: ${requirementName}`;
  const issueResult = await createGitHubIssue(title, issueBody);
  
  return {
    success: issueResult.success,
    issue_id: issueResult.issue_id,
    issue_url: issueResult.issue_url,
    error: issueResult.error
  };
}

function getStoredDeviceCode() {
  return storedDeviceCode;
}

module.exports = { 
  DEVICE_FLOW_CONFIG, 
  generateDeviceCode, 
  pollAuthorization, 
  createGitHubIssue,
  continueAfterAuthorization,
  getStoredDeviceCode
};
