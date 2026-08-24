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
      siteName: 'Komatsu KRA Business OneDrive',
      workbookPath: '/Documents/PPC_Production_Schedule.xlsx',
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

  // Fetch live server status of SharePoint sync and history
  getStatus: async (): Promise<any> => {
    const res = await fetch('/api/sharepoint/status');
    if (!res.ok) throw new Error('Failed to load SharePoint status');
    return res.json();
  },

  // Populate simulated SharePoint sheet with 15 UAT records
  populateDummy: async (): Promise<any> => {
    const res = await fetch('/api/sharepoint/populate-dummy', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to populate dummy UAT records');
    return res.json();
  },

  // Get preview of pending excel changes with status details
  getPreview: async (): Promise<any> => {
    const res = await fetch('/api/sharepoint/preview');
    if (!res.ok) throw new Error('Failed to load sync preview');
    return res.json();
  },

  // Commit selected sync items into active Firestore priorityQueue
  commitSync: async (items: any[], currentUser: string): Promise<any> => {
    const res = await fetch('/api/sharepoint/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, currentUser }),
    });
    if (!res.ok) throw new Error('Failed to commit SharePoint synchronization');
    return res.json();
  },

  // Edit simulated sheet row directly in the UAT sandbox
  updateWorkbookRow: async (row: any): Promise<any> => {
    const res = await fetch('/api/sharepoint/update-workbook-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error('Failed to update workbook row');
    return res.json();
  },

  // Sync workbook schedule via server proxy (for backward compatibility if needed)
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
