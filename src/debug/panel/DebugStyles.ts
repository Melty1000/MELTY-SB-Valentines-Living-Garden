export const DEBUG_STYLES = `
  #debug-ui h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #94a3b8;
    margin: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
  }
  #debug-ui h2::after {
    content: '▼';
    font-size: 8px;
    transition: transform 0.2s;
  }
  #debug-ui h2.collapsed::after {
    transform: rotate(-90deg);
  }
  #debug-ui .panel {
    background: #1e293b;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 6px;
  }
  #debug-ui .panel-content {
    display: block;
    padding-top: 8px;
    border-top: 1px solid #334155;
    margin-top: 8px;
  }
  #debug-ui .panel-content.hidden {
    display: none;
  }
  #debug-ui button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    margin: 2px;
    transition: background 0.15s;
  }
  #debug-ui button:hover {
    background: #2563eb;
  }
  #debug-ui button.danger {
    background: #ef4444;
  }
  #debug-ui button.danger:hover {
    background: #dc2626;
  }
  #debug-ui button.success {
    background: #22c55e;
  }
  #debug-ui button.success:hover {
    background: #16a34a;
  }
  #debug-ui button.warning {
    background: #f59e0b;
  }
  #debug-ui button.warning:hover {
    background: #d97706;
  }
  #debug-ui button.purple {
    background: #8b5cf6;
  }
  #debug-ui button.purple:hover {
    background: #7c3aed;
  }
  #debug-ui button.pink {
    background: #ec4899;
  }
  #debug-ui button.pink:hover {
    background: #db2777;
  }
  #debug-ui .btn-row {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-bottom: 6px;
  }
  #debug-ui input[type="range"] {
    width: 100%;
    margin: 4px 0;
    height: 4px;
  }
  #debug-ui input[type="color"] {
    width: 30px;
    height: 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  #debug-ui input[type="number"] {
    width: 50px;
    padding: 4px 6px;
    border: 1px solid #475569;
    border-radius: 4px;
    background: #0f172a;
    color: white;
    font-size: 11px;
  }
  #debug-ui select {
    padding: 4px 8px;
    border: 1px solid #475569;
    border-radius: 4px;
    background: #0f172a;
    color: white;
    font-size: 11px;
  }
  #debug-ui label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    margin: 4px 0;
  }
  #debug-ui .slider-label {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94a3b8;
  }
  #debug-ui .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #475569;
    color: white;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    z-index: 100000;
  }
  #debug-ui .close-btn:hover {
    background: #ef4444;
  }
  #debug-ui .header {
    text-align: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #334155;
  }
  #debug-ui .header h1 {
    font-size: 14px;
    margin: 0;
    color: #f1f5f9;
  }
  #debug-ui .header p {
    color: #64748b;
    margin: 2px 0 0 0;
    font-size: 10px;
  }
  #debug-status {
    background: #0f172a;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 11px;
    display: flex;
    gap: 12px;
  }
`;
