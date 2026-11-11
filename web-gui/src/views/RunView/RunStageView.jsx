import { useState } from 'react';
import { useLine } from '../../context/LineContext.js';
import { submitSimulationRun } from '../../services/apiClient.js';

const HORIZON_PRESETS = [
  { label: '1 Shift', seconds: 28800 },
  { label: '1 Day', seconds: 86400 },
  { label: '1 Week', seconds: 604800 },
  { label: '1 Month', seconds: 2592000 },
  { label: '1 Year', seconds: 31536000 },
];

export default function RunStageView() {
  const { model, updateRunConfig, updateAnalysisConfig, validation } =
    useLine();
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8080/api');
  const [requestStatus, setRequestStatus] = useState(null);

  const { run, analysis } = model;
  const warmupSeconds = ((run.horizon || 0) * (run.warmupPct || 0)) / 100;

  const handleTriggerRestRun = async () => {
    setRequestStatus({
      state: 'loading',
      message: `Sending POST ${apiBaseUrl}/simulate ...`,
    });
    try {
      await submitSimulationRun(model, apiBaseUrl);
      setRequestStatus({
        state: 'success',
        message: 'POST /simulate succeeded.',
      });
    } catch (err) {
      setRequestStatus({
        state: 'error',
        message: `REST request failed: ${err.message}`,
      });
    }
  };

  return (
    <div className="wb-stage-container wb-run-grid">
      <section className="wb-card">
        <div className="wb-card-header">
          <div>
            <h2 className="wb-card-title">Run Configuration</h2>
            <p className="wb-card-subtitle">
              All times in seconds; each replication derives its stream from the
              master seed
            </p>
          </div>
        </div>

        <div className="wb-form-grid">
          <label className="wb-field">
            <span className="wb-field-label">Master Seed</span>
            <input
              type="number"
              step="1"
              className="wb-input"
              value={run.seed}
              onChange={(e) =>
                updateRunConfig({ seed: parseInt(e.target.value || '0', 10) })
              }
            />
          </label>

          <label className="wb-field">
            <span className="wb-field-label">Replications</span>
            <input
              type="number"
              min="1"
              step="1"
              className="wb-input"
              value={run.replications}
              onChange={(e) =>
                updateRunConfig({
                  replications: Math.max(
                    1,
                    parseInt(e.target.value || '1', 10)
                  ),
                })
              }
            />
          </label>

          <label className="wb-field">
            <span className="wb-field-label">Horizon in Seconds</span>
            <input
              type="number"
              min="1"
              className="wb-input"
              value={run.horizon}
              onChange={(e) =>
                updateRunConfig({
                  horizon: Math.max(1, Number(e.target.value || 1)),
                })
              }
            />
            <div className="wb-chip-picker" style={{ marginTop: '0.35rem' }}>
              {HORIZON_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`wb-pick-chip ${
                    run.horizon === preset.seconds ? 'is-picked' : ''
                  }`}
                  onClick={() => updateRunConfig({ horizon: preset.seconds })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </label>

          <label className="wb-field">
            <span className="wb-field-label">Warm-Up Percentage</span>
            <input
              type="number"
              min="0"
              max="99.9"
              step="0.5"
              className="wb-input"
              value={run.warmupPct}
              onChange={(e) =>
                updateRunConfig({
                  warmupPct: Number(e.target.value || 0),
                })
              }
            />
            <span className="wb-muted-note">
              Computed warm-up: {warmupSeconds.toLocaleString()} s
            </span>
          </label>

          <label className="wb-field">
            <span className="wb-field-label">Confidence Level</span>
            <select
              className="wb-select"
              value={run.confidence}
              onChange={(e) =>
                updateRunConfig({ confidence: Number(e.target.value) })
              }
            >
              <option value={0.9}>0.90</option>
              <option value={0.95}>0.95</option>
              <option value={0.99}>0.99</option>
            </select>
          </label>

          <div className="wb-field">
            <span className="wb-field-label">Relaxation Probes</span>
            <label className="wb-checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(analysis.probes)}
                onChange={(e) =>
                  updateAnalysisConfig({ probes: e.target.checked })
                }
              />
              <span>Run relaxation probes for bottleneck ranking</span>
            </label>
          </div>
        </div>
      </section>

      <section className="wb-card">
        <div className="wb-card-header">
          <div>
            <h2 className="wb-card-title">REST API Runner</h2>
            <p className="wb-card-subtitle">
              Standard HTTP REST transport. Output view is currently on hold.
            </p>
          </div>
        </div>

        <div className="wb-field">
          <span className="wb-field-label">C++ Server Base URL</span>
          <div className="wb-inline-form">
            <input
              type="url"
              className="wb-input"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
            />
            <button
              type="button"
              className="wb-btn wb-btn-primary"
              disabled={
                !validation.isValid || requestStatus?.state === 'loading'
              }
              onClick={handleTriggerRestRun}
            >
              {requestStatus?.state === 'loading'
                ? 'Sending...'
                : 'POST /simulate'}
            </button>
          </div>
          {!validation.isValid && (
            <p className="wb-form-error">
              Resolve the {validation.allErrors.length} validation error before
              submitting to the simulator.
            </p>
          )}
        </div>

        {requestStatus && (
          <div
            className={`wb-banner ${
              requestStatus.state === 'error' ? 'wb-banner-err' : 'wb-banner-ok'
            }`}
          >
            <span>{requestStatus.message}</span>
          </div>
        )}
      </section>
    </div>
  );
}
