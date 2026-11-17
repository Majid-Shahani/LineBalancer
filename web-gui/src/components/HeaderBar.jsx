import { useRef } from 'react';
import { useLine } from '../context/LineContext.js';
import { PRESETS } from '../schema/presets.js';
import { serializeModel } from '../utils/serializer.js';

const STAGES = [
  {
    id: 'recipe',
    label: 'Product & Recipe',
  },
  {
    id: 'layout',
    label: 'Line Layout',
  },
  {
    id: 'run',
    label: 'Run & REST API',
  },
];

export default function HeaderBar() {
  const {
    model,
    setModel,
    validation,
    activeStage,
    setActiveStage,
    setIsValidationOpen,
    isJsonDrawerOpen,
    setIsJsonDrawerOpen,
  } = useLine();

  const fileInputRef = useRef(null);

  const handlePresetChange = (e) => {
    const presetId = e.target.value;
    if (!presetId) return;
    const found = PRESETS.find((p) => p.id === presetId);
    if (found) {
      setModel(structuredClone(found.model));
    }
    e.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result || '{}'));
        setModel(parsed);
      } catch (err) {
        alert(`Failed to parse JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJson = () => {
    const jsonString = serializeModel(model);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'line-model.v1.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const versionMatchesAndValid = model.version === 1 && validation.isValid;

  return (
    <div className="wb-top-chrome">
      <header className="wb-header">
        <div className="wb-brand">
          <div className="wb-logo-mark">LB</div>
          <span className="wb-title">LineBalancer</span>
        </div>

        <div className="wb-actions">
          <select
            className="wb-select"
            defaultValue=""
            onChange={handlePresetChange}
            aria-label="Load preset model"
          >
            <option value="" disabled>
              Load Preset...
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={handleImportClick}
            title="Import JSON v1 file"
          >
            Import
          </button>

          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={handleExportJson}
            title="Export normalized JSON v1 file"
          >
            Export
          </button>

          <button
            type="button"
            className={`wb-status-pill ${
              versionMatchesAndValid ? 'is-valid' : 'is-invalid'
            } ${isJsonDrawerOpen ? 'is-toggled' : ''}`}
            onClick={() => {
              setIsValidationOpen(false);
              setIsJsonDrawerOpen((v) => !v);
            }}
            title={
              versionMatchesAndValid
                ? 'JSON V1 Valid — Click to open JSON & Schema'
                : 'Validation / Version Mismatch — Click to inspect'
            }
          >
            <span className="wb-status-dot" />
            {`{ } JSON`}
          </button>
        </div>
      </header>

      <nav className="wb-stage-bar" aria-label="Workbench Stages">
        {STAGES.map((stage) => {
          const isActive = activeStage === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              className={`wb-stage-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                setActiveStage(stage.id);
                setIsValidationOpen(false);
                setIsJsonDrawerOpen(false);
              }}
            >
              <span className="wb-stage-label">{stage.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
