export const DEBUG_STYLES = `
  #debug-ui h2 {
    font-size;
    text-transform;
    letter-spacing;
    color: #94a3b8;
    margin;
    cursor;
    display;
    align-items;
    justify-content: space-between;
    padding: 8px 0;
  }
  #debug-ui h2::after {
    content: '▼';
    font-size;
    transition: transform 0.2s;
  }
  #debug-ui h2.collapsed::after {
    transform: rotate(-90deg);
  }
  #debug-ui .panel {
    background: #1e293b;
    border-radius;
    padding;
    margin-bottom;
  }
  #debug-ui .panel-content {
    display;
    padding-top;
    border-top: 1px solid #334155;
    margin-top;
  }
  #debug-ui .panel-content.hidden {
    display;
  }
  #debug-ui button {
    background: #3b82f6;
    color;
    border;
    padding: 6px 10px;
    border-radius;
    cursor;
    font-size;
    margin;
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
    display;
    flex-wrap;
    gap;
    margin-bottom;
  }
  #debug-ui input[type="range"] {
    width: 100%;
    margin: 4px 0;
    height;
  }
  #debug-ui input[type="color"] {
    width;
    height;
    border;
    border-radius;
    cursor;
  }
  #debug-ui input[type="number"] {
    width;
    padding: 4px 6px;
    border: 1px solid #475569;
    border-radius;
    background: #0f172a;
    color;
    font-size;
  }
  #debug-ui select {
    padding: 4px 8px;
    border: 1px solid #475569;
    border-radius;
    background: #0f172a;
    color;
    font-size;
  }
  #debug-ui label {
    display;
    align-items;
    gap;
    font-size;
    margin: 4px 0;
  }
  #debug-ui .slider-label {
    display;
    justify-content: space-between;
    font-size;
    color: #94a3b8;
  }
  #debug-ui .close-btn {
    position;
    top;
    right;
    background: #475569;
    color;
    border;
    width;
    height;
    border-radius;
    font-size;
    cursor;
    z-index;
  }
  #debug-ui .close-btn:hover {
    background: #ef4444;
  }
  #debug-ui .header {
    text-align;
    margin-bottom;
    padding-bottom;
    border-bottom: 1px solid #334155;
  }
  #debug-ui .header h1 {
    font-size;
    margin;
    color: #f1f5f9;
  }
  #debug-ui .header p {
    color: #64748b;
    margin: 2px 0 0 0;
    font-size;
  }
  #debug-status {
    background: #0f172a;
    padding: 6px 8px;
    border-radius;
    font-size;
    display;
    gap;
  }
`;
