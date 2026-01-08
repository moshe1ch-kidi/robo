import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App'; // התיקון כאן: הוספנו את הנתיב לתיקיית components

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode removed to prevent double-mounting issues with Blockly/Threejs
  <App />
);
