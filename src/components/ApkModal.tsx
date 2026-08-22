import React, { useState } from 'react';
import { Smartphone, Download, ExternalLink, Copy, Check, X, ShieldCheck, Zap } from 'lucide-react';

interface ApkModalProps {
  onClose: () => void;
}

export const ApkModal: React.FC<ApkModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const appUrl = window.location.origin;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Download Android APK & PWA App
              </h3>
              <p className="text-xs text-slate-500">
                Install Testing PRO on Android phones, tablets & industrial terminals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Method 1: Instant PWA Install (No APK download required) */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Method 1: Instant Android App Install (Recommended)</span>
              </span>
              <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                Instant
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Testing PRO is configured as a <strong>Progressive Web App (PWA)</strong>. You can install it on your Android device as a standalone app with a home screen icon without needing to install an unverified APK:
            </p>
            <ol className="list-decimal pl-5 text-xs text-slate-700 space-y-1 font-medium">
              <li>Open this web page in <strong>Google Chrome</strong> on your Android phone/tablet.</li>
              <li>Tap the <strong>Chrome menu (⋮)</strong> at the top right corner.</li>
              <li>Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
              <li>Launch Testing PRO directly from your Android launcher!</li>
            </ol>
          </div>

          {/* Method 2: Convert to standalone .APK using PWABuilder */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Download className="w-4 h-4 text-slate-600" />
                <span>Method 2: Package as .APK via PWABuilder</span>
              </span>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Standalone APK
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If your organization requires a physical <strong>.apk file</strong> for distribution via MDM or sideloading:
            </p>

            {/* App URL Copy Box */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Your App Live URL:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="flex-1 bg-white border border-slate-300 text-xs font-mono text-slate-800 p-2 rounded-lg"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1 font-medium pt-1">
              <li>Copy your live app URL above.</li>
              <li>Go to <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5">PWABuilder.com <ExternalLink className="w-3 h-3" /></a></li>
              <li>Paste your app URL and click <strong>Start</strong>.</li>
              <li>
                <em>Note for Cloud Run/Protected Preview URLs:</em> If PWABuilder says <strong>"Create a web app manifest"</strong> or <strong>"Missing Name"</strong>, click the purple <strong>"Edit Your Manifest"</strong> button in PWABuilder and paste the manifest values below:
              </li>
            </ol>

            {/* Manifest JSON Copy Box */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">PWABuilder Manifest JSON (if needed):</label>
                <button
                  type="button"
                  onClick={() => {
                    const manifestStr = JSON.stringify({
                      short_name: "Testing PRO",
                      name: "Testing PRO - Industrial Quality Checksheet & Lead-Time System",
                      description: "Android-first quality control system for GLT, Engine Dynotest, and Power Train Hydraulic Test recording.",
                      id: "/",
                      start_url: appUrl,
                      scope: "/",
                      display: "standalone",
                      orientation: "portrait",
                      background_color: "#0f172a",
                      theme_color: "#2563eb",
                      icons: [
                        { src: `${appUrl}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any maskable" },
                        { src: `${appUrl}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" }
                      ]
                    }, null, 2);
                    navigator.clipboard.writeText(manifestStr);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Manifest JSON</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-100 p-3 rounded-xl border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All forms, camera scanners, offline checksheet data, and Google Drive backups function seamlessly in Android app mode.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
