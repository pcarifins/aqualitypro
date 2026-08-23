import React, { useState } from 'react';
import { Sparkles, Bot, AlertCircle, RefreshCw, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface AITroubleshootingCardProps {
  process: string;
  unitModel?: string;
  component?: string;
  ngItem?: string;
  ngDescription?: string;
}

export const AITroubleshootingCard: React.FC<AITroubleshootingCardProps> = ({
  process,
  unitModel,
  component,
  ngItem,
  ngDescription,
}) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const handleFetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/troubleshoot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          process,
          unitModel,
          component,
          ngItem,
          ngDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.suggestion) {
        setSuggestion(data.suggestion);
      } else {
        setSuggestion(data.fallback || 'No suggestions returned.');
      }
    } catch (err: any) {
      console.warn('AI Troubleshooting API unavailable:', err);
      // Fallback suggestions
      setSuggestion(
        `AI ADVISORY ONLY: Recommended standard mechanical checks:\n` +
        `• Check mating surfaces, O-rings, and oil seal orientation for damage or pinched rubber.\n` +
        `• Verify bolt torque values according to Komatsu shop manual specs.\n` +
        `• Inspect hydraulic hoses, fittings, and quick disconnects for tightness.\n` +
        `• Verify sensor electrical connectors, ground wires, and harness routing.\n` +
        `• Re-check pressure relief valve adjustments and oil cleaniness level.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/10 via-slate-900/5 to-purple-900/10 border border-indigo-200 rounded-2xl p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                AI Troubleshooting Advisory
              </h4>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-indigo-200">
                ADVISORY ONLY
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Reference guidance for NG finding: <strong className="text-indigo-900">{ngItem || 'Inspection Defect'}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1">
          {/* Disclaimer warning banner */}
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-2.5 text-[11px] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong>Mandatory Compliance Notice:</strong> AI suggestions are purely advisory recommendations. They do not replace official Komatsu shop manuals, engineering standards, or supervisor approvals.
            </div>
          </div>

          {!suggestion && !loading && (
            <button
              type="button"
              onClick={handleFetchSuggestions}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2"
            >
              <Bot className="w-4 h-4" />
              <span>Get AI Troubleshooting Suggestions</span>
            </button>
          )}

          {loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Analyzing defect parameter with AI model...
              </p>
            </div>
          )}

          {suggestion && !loading && (
            <div className="space-y-2">
              <div className="bg-white border border-indigo-100 rounded-xl p-3.5 text-xs text-slate-800 space-y-2 font-sans leading-relaxed whitespace-pre-wrap shadow-2xs">
                {suggestion}
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Advisory generated for {component || unitModel || process}</span>
                </span>
                <button
                  type="button"
                  onClick={handleFetchSuggestions}
                  className="text-indigo-600 font-bold hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Suggestions</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
