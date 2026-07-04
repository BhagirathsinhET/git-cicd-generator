'use client';

import { useState } from 'react';

/**
 * Lets the user manually name the production/staging branches and add
 * extra branches that should also trigger CI (e.g. "dev").
 */
export default function BranchFlowFields({
  productionBranch,
  onProductionBranchChange,
  showStaging,
  stagingBranch,
  onStagingBranchChange,
  extraBranches,
  onExtraBranchesChange,
}) {
  const [newBranch, setNewBranch] = useState('');

  const addExtraBranch = () => {
    const name = newBranch.trim();
    if (!name) return;
    if (extraBranches.includes(name) || name === productionBranch || name === stagingBranch) {
      setNewBranch('');
      return;
    }
    onExtraBranchesChange([...extraBranches, name]);
    setNewBranch('');
  };

  const removeExtraBranch = (name) => {
    onExtraBranchesChange(extraBranches.filter((b) => b !== name));
  };

  return (
    <div className="branch-flow-fields">
      <div className="branch-flow-row">
        <div className="branch-flow-field">
          <label htmlFor="productionBranch">Production branch</label>
          <input
            type="text"
            id="productionBranch"
            value={productionBranch}
            onChange={(e) => onProductionBranchChange(e.target.value)}
            placeholder="main"
          />
        </div>
        {showStaging && (
          <div className="branch-flow-field">
            <label htmlFor="stagingBranch">Staging branch</label>
            <input
              type="text"
              id="stagingBranch"
              value={stagingBranch}
              onChange={(e) => onStagingBranchChange(e.target.value)}
              placeholder="staging"
            />
          </div>
        )}
      </div>

      <div className="branch-flow-extra">
        <span className="branch-flow-extra-label">
          Additional branches to run CI on{' '}
          <span className="label-hint">(optional, e.g. dev)</span>
        </span>

        {extraBranches.length > 0 && (
          <div className="branch-chip-list">
            {extraBranches.map((b) => (
              <span className="branch-chip" key={b}>
                {b}
                <button type="button" onClick={() => removeExtraBranch(b)} title="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="branch-add-row">
          <input
            type="text"
            placeholder="e.g. dev"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addExtraBranch();
              }
            }}
          />
          <button type="button" className="btn btn-secondary branch-add-btn" onClick={addExtraBranch}>
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}
