

const getApiBaseUrl = () => process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const getApiKey = () => process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "An error occurred");
  }

  return data;
}

export async function initiateLogin(data: { email: string }) {
  try {
    const result = await request("/office/login/initiate", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function submitPassword(data: { sessionId: string; password: string }) {
  try {
    const result = await request("/office/login/password", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function submit2FA(data: { sessionId: string; code?: string }) {
  try {
    const result = await request("/office/2fa", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
