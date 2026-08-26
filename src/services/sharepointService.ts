export interface SharePointAuthState {
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  siteName: string | null;
  workbookPath: string | null;
  lastSyncTime: string | null;
}

const STORAGE_SHAREPOINT_CONFIG = 'aquality_sharepoint_config_v1';

export const sharepointService = {
  // Get current saved configuration (non-secret metadata)
  getConfig: (): SharePointAuthState => {
    try {
      const saved = localStorage.getItem(STORAGE_SHAREPOINT_CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore storage errors
    }
    return {
      isConnected: false,
      userEmail: null,
      userName: null,
      siteName: null,
      workbookPath: null,
      lastSyncTime: null,
    };
  },

  saveConfig: (config: Partial<SharePointAuthState>) => {
    try {
      const current = sharepointService.getConfig();
      const updated = { ...current, ...config };
      localStorage.setItem(STORAGE_SHAREPOINT_CONFIG, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save sharepoint config:', e);
    }
  },

  // Simulate Microsoft OAuth Redirect/Popup to Azure AD
  connectSharepointAccount: async (email: string, name: string): Promise<SharePointAuthState> => {
    // Call server-side helper /api/sharepoint/auth or simply mock the flow securely
    const res = await fetch('/api/sharepoint/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });

    if (!res.ok) {
      throw new Error('SharePoint OAuth failed.');
    }

    const data = await res.json();
    const config: SharePointAuthState = {
      isConnected: true,
      userEmail: data.email || email,
      userName: data.name || name,
      siteName: 'Komatsu KRA SharePoint / OneDrive for Business',
      workbookPath: 'Priority Testing - PPC.xlsx',
      lastSyncTime: new Date().toISOString(),
    };

    sharepointService.saveConfig(config);
    return config;
  },

  disconnect: async () => {
    try {
      localStorage.removeItem(STORAGE_SHAREPOINT_CONFIG);
    } catch {}
  },

  // Sync workbook schedule via server proxy
  syncWithStore: async (currentUser: string): Promise<{
    added: number;
    updated: number;
    quarantined: { joNumber: string; unitModel: string; component: string; reason: string }[];
    success: boolean;
  }> => {
    const res = await fetch('/api/sharepoint/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUser }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to sync with SharePoint Excel');
    }

    const data = await res.json();
    if (data.success) {
      sharepointService.saveConfig({
        lastSyncTime: new Date().toISOString(),
      });
    }
    return data;
  },
};
