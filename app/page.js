'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export default function JsonFormatter() {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [error, setError] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted', 'tree', 'minified'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ matches: 0, currentMatch: 0 });
  const [jsonStats, setJsonStats] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareJson, setCompareJson] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef(null);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('json-formatter-dark-mode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode - Fixed version
  const toggleDarkMode = useCallback(() => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('json-formatter-dark-mode', newMode.toString());
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Add to history
  const addToHistory = useCallback((json) => {
    if (json.trim() && json !== history[history.length - 1]) {
      const newHistory = [...history.slice(-19), json]; // Keep last 20
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history]);

  // Calculate JSON statistics
  const calculateStats = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      const calculateDepth = (obj, depth = 0) => {
        if (typeof obj !== 'object' || obj === null) return depth;
        return Math.max(...Object.values(obj).map(value => calculateDepth(value, depth + 1)));
      };

      const countItems = (obj) => {
        let count = 0;
        const traverse = (item) => {
          if (typeof item === 'object' && item !== null) {
            count++;
            if (Array.isArray(item)) {
              item.forEach(traverse);
            } else {
              Object.values(item).forEach(traverse);
            }
          } else {
            count++;
          }
        };
        traverse(obj);
        return count;
      };

      const getDataTypes = (obj) => {
        const types = new Set();
        const traverse = (item) => {
          if (item === null) {
            types.add('null');
          } else if (Array.isArray(item)) {
            types.add('array');
            item.forEach(traverse);
          } else if (typeof item === 'object') {
            types.add('object');
            Object.values(item).forEach(traverse);
          } else {
            types.add(typeof item);
          }
        };
        traverse(obj);
        return Array.from(types);
      };

      return {
        size: jsonString.length,
        depth: calculateDepth(parsed),
        items: countItems(parsed),
        types: getDataTypes(parsed),
        keys: JSON.stringify(parsed).match(/"[^"]*":/g)?.length || 0
      };
    } catch {
      return null;
    }
  }, []);

  // Enhanced format JSON with history
  const formatJson = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setError('Please enter JSON to format');
        setOutputJson('');
        setJsonStats(null);
        return;
      }

      const parsed = JSON.parse(inputJson);
      const formatted = JSON.stringify(parsed, null, indentSize);
      setOutputJson(formatted);
      setError('');
      setJsonStats(calculateStats(inputJson));
      addToHistory(inputJson);
    } catch (err) {
      const errorMsg = getDetailedError(err, inputJson);
      setError('Invalid JSON: ' + errorMsg);
      setOutputJson('');
      setJsonStats(null);
    }
  }, [inputJson, indentSize, calculateStats, addToHistory]);

  // Get detailed error information
  const getDetailedError = (error, jsonString) => {
    const message = error.message;
    
    // Try to extract position information
    const positionMatch = message.match(/position (\d+)/);
    if (positionMatch) {
      const position = parseInt(positionMatch[1]);
      const lines = jsonString.substring(0, position).split('\n');
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;
      return `${message} (Line ${lineNumber}, Column ${columnNumber})`;
    }
    
    return message;
  };

  // Enhanced minify JSON
  const minifyJson = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setError('Please enter JSON to minify');
        setOutputJson('');
        setJsonStats(null);
        return;
      }

      const parsed = JSON.parse(inputJson);
      const minified = JSON.stringify(parsed);
      setOutputJson(minified);
      setError('');
      setJsonStats(calculateStats(inputJson));
      addToHistory(inputJson);
    } catch (err) {
      const errorMsg = getDetailedError(err, inputJson);
      setError('Invalid JSON: ' + errorMsg);
      setOutputJson('');
      setJsonStats(null);
    }
  }, [inputJson, calculateStats, addToHistory]);

  // Generate tree view
  const generateTreeView = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setError('Please enter JSON to view as tree');
        setOutputJson('');
        setJsonStats(null);
        return;
      }

      const parsed = JSON.parse(inputJson);
      const treeView = generateJsonTree(parsed);
      setOutputJson(treeView);
      setViewMode('tree');
      setError('');
      setJsonStats(calculateStats(inputJson));
      addToHistory(inputJson);
    } catch (err) {
      const errorMsg = getDetailedError(err, inputJson);
      setError('Invalid JSON: ' + errorMsg);
      setOutputJson('');
      setJsonStats(null);
    }
  }, [inputJson, calculateStats, addToHistory]);

  // Helper function to generate tree view
  const generateJsonTree = (obj, prefix = '', isLast = true) => {
    let result = '';
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        result += `${prefix}├── Array[${obj.length}]\n`;
        obj.forEach((item, index) => {
          const isLastItem = index === obj.length - 1;
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          result += generateJsonTree(item, newPrefix, isLastItem);
        });
      } else {
        const keys = Object.keys(obj);
        keys.forEach((key, index) => {
          const isLastItem = index === keys.length - 1;
          const connector = isLastItem ? '└── ' : '├── ';
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            result += `${prefix}${connector}${key}:\n`;
            result += generateJsonTree(obj[key], newPrefix, isLastItem);
          } else {
            const value = JSON.stringify(obj[key]);
            result += `${prefix}${connector}${key}: ${value}\n`;
          }
        });
      }
    } else {
      const value = JSON.stringify(obj);
      result += `${prefix}└── ${value}\n`;
    }
    
    return result;
  };

  // Enhanced validate JSON
  const validateJson = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setError('Please enter JSON to validate');
        setJsonStats(null);
        return;
      }

      const parsed = JSON.parse(inputJson);
      const stats = calculateStats(inputJson);
      setJsonStats(stats);
      setError(`✅ Valid JSON - ${stats.items} items, ${stats.depth} levels deep, ${stats.keys} keys`);
    } catch (err) {
      const errorMsg = getDetailedError(err, inputJson);
      setError('❌ Invalid JSON: ' + errorMsg);
      setJsonStats(null);
    }
  }, [inputJson, calculateStats]);

  // Sort JSON keys
  const sortJson = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setError('Please enter JSON to sort');
        setOutputJson('');
        return;
      }

      const parsed = JSON.parse(inputJson);
      const sorted = sortObjectKeys(parsed);
      const formatted = JSON.stringify(sorted, null, indentSize);
      setOutputJson(formatted);
      setError('');
      setJsonStats(calculateStats(inputJson));
      addToHistory(inputJson);
    } catch (err) {
      const errorMsg = getDetailedError(err, inputJson);
      setError('Invalid JSON: ' + errorMsg);
      setOutputJson('');
    }
  }, [inputJson, indentSize, calculateStats, addToHistory]);

  // Helper function to recursively sort object keys
  const sortObjectKeys = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    } else if (typeof obj === 'object' && obj !== null) {
      const sorted = {};
      Object.keys(obj).sort().forEach(key => {
        sorted[key] = sortObjectKeys(obj[key]);
      });
      return sorted;
    }
    return obj;
  };

  // Escape/Unescape JSON
  const escapeJson = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setError('Please enter JSON to escape');
        setOutputJson('');
        return;
      }

      const escaped = JSON.stringify(inputJson);
      setOutputJson(escaped);
      setError('');
    } catch (err) {
      setError('Error escaping JSON: ' + err.message);
      setOutputJson('');
    }
  }, [inputJson]);

  const unescapeJson = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setError('Please enter escaped JSON to unescape');
        setOutputJson('');
        return;
      }

      const unescaped = JSON.parse(inputJson);
      setOutputJson(typeof unescaped === 'string' ? unescaped : JSON.stringify(unescaped, null, indentSize));
      setError('');
    } catch (err) {
      setError('Error unescaping JSON: ' + err.message);
      setOutputJson('');
    }
  }, [inputJson, indentSize]);

  // Enhanced clear function
  const clearAll = useCallback(() => {
    setInputJson('');
    setOutputJson('');
    setError('');
    setJsonStats(null);
    setSearchTerm('');
    setSearchResults({ matches: 0, currentMatch: 0 });
    setViewMode('formatted');
  }, []);

  // Enhanced copy to clipboard with feedback
  const copyToClipboard = useCallback(async () => {
    if (outputJson) {
      try {
        await navigator.clipboard.writeText(outputJson);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = outputJson;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  }, [outputJson]);

  // File upload functionality
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setInputJson(e.target.result);
          setError('');
        };
        reader.onerror = () => {
          setError('Error reading file');
        };
        reader.readAsText(file);
      } else {
        setError('Please select a valid JSON file');
      }
    }
  }, []);

  // File download functionality
  const downloadJson = useCallback(() => {
    if (!outputJson) {
      setError('No formatted JSON to download');
      return;
    }

    const blob = new Blob([outputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formatted.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [outputJson]);

  // Enhanced search functionality
  const performSearch = useCallback((term) => {
    if (!term || !outputJson) {
      setSearchResults({ matches: 0, currentMatch: 0 });
      return;
    }

    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = [...outputJson.matchAll(regex)];
    setSearchResults({ matches: matches.length, currentMatch: matches.length > 0 ? 1 : 0 });
  }, [outputJson]);

  // Update search when term changes
  useEffect(() => {
    performSearch(searchTerm);
  }, [searchTerm, performSearch]);

  // Get display text with basic highlighting info
  const getDisplayText = useCallback(() => {
    if (!searchTerm || !outputJson) return outputJson;
    
    // Split into lines and mark which lines contain matches
    const lines = outputJson.split('\n');
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    return lines.map((line, index) => {
      const hasMatch = searchRegex.test(line);
      return hasMatch ? `→ ${line}` : `  ${line}`;
    }).join('\n');
  }, [outputJson, searchTerm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            formatJson();
            break;
          case 'm':
            e.preventDefault();
            minifyJson();
            break;
          case 'k':
            e.preventDefault();
            clearAll();
            break;
          case 'd':
            e.preventDefault();
            toggleDarkMode();
            break;
          case 's':
            e.preventDefault();
            downloadJson();
            break;
          case 'u':
            e.preventDefault();
            fileInputRef.current?.click();
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formatJson, minifyJson, clearAll, toggleDarkMode, downloadJson]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInputJson(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setInputJson(history[newIndex]);
    }
  }, [history, historyIndex]);

  const sampleJson = `{
  "name": "John Doe",
  "age": 30,
  "city": "New York",
  "isActive": true,
  "salary": 75000.50,
  "hobbies": ["reading", "swimming", "coding"],
  "address": {
    "street": "123 Main St",
    "apartment": "4B",
    "zipcode": "10001",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "projects": [
    {
      "name": "JSON Formatter",
      "status": "completed",
      "technologies": ["React", "Next.js", "Tailwind"],
      "team": {
        "lead": "John Doe",
        "members": ["Alice", "Bob", "Charlie"]
      }
    },
    {
      "name": "Task Manager",
      "status": "in-progress", 
      "technologies": ["Vue", "Node.js"],
      "deadline": "2025-12-31"
    }
  ],
  "metadata": {
    "lastUpdated": "2025-08-13T10:30:00Z",
    "version": "1.2.0",
    "tags": null
  }
}`;

  const loadSample = useCallback(() => {
    setInputJson(sampleJson);
    setError('');
    setOutputJson('');
    setJsonStats(null);
  }, [sampleJson]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                JSON Formatter & Validator Pro
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Advanced JSON formatting, validation, and analysis tool
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
                title={`Switch to ${darkMode ? 'light' : 'dark'} mode (Ctrl+D)`}
              >
                <span className="text-lg">
                  {darkMode ? '☀️' : '🌙'}
                </span>
              </button>
              
              {/* History controls */}
              {history.length > 0 && (
                <div className="flex gap-1">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    ↶
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Redo"
                  >
                    ↷
                  </button>
                </div>
              )}

              {/* File operations */}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="Upload JSON file (Ctrl+U)"
                >
                  📁 Upload
                </button>
                <button
                  onClick={downloadJson}
                  disabled={!outputJson}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download JSON (Ctrl+S)"
                >
                  💾 Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={formatJson}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              title="Format JSON (Ctrl+Enter)"
            >
              🎨 Format
            </button>
            <button
              onClick={minifyJson}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
              title="Minify JSON (Ctrl+M)"
            >
              🗜️ Minify
            </button>
            <button
              onClick={generateTreeView}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
            >
              🌳 Tree View
            </button>
            <button
              onClick={validateJson}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              ✅ Validate
            </button>
            <button
              onClick={sortJson}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium shadow-sm"
            >
              🔤 Sort Keys
            </button>
          </div>
          
          {/* Secondary actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={escapeJson}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              🔒 Escape
            </button>
            <button
              onClick={unescapeJson}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              🔓 Unescape
            </button>
            <button
              onClick={loadSample}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
            >
              📝 Sample
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              title="Clear all (Ctrl+K)"
            >
              🗑️ Clear
            </button>
          </div>

          {/* Settings */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Indent:
              </label>
              <select
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>

            {/* Search */}
            {outputJson && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  🔍 Search:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search in output..."
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-48"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                  {searchResults.matches > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {searchResults.matches} match{searchResults.matches !== 1 ? 'es' : ''}
                    </span>
                  )}
                  {searchTerm && searchResults.matches === 0 && (
                    <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                      No matches
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error/Success/Stats Messages */}
        {error && (
          <div className={`mb-4 p-4 rounded-lg border ${
            error.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
          }`}>
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* JSON Statistics */}
        {jsonStats && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold mb-2">📊 JSON Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="font-medium">Size:</span> {jsonStats.size.toLocaleString()} chars
              </div>
              <div>
                <span className="font-medium">Items:</span> {jsonStats.items}
              </div>
              <div>
                <span className="font-medium">Depth:</span> {jsonStats.depth} levels
              </div>
              <div>
                <span className="font-medium">Keys:</span> {jsonStats.keys}
              </div>
              <div>
                <span className="font-medium">Types:</span> {jsonStats.types.join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* Copy success notification */}
        {copySuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="font-medium">✅ Copied to clipboard!</p>
          </div>
        )}

        {/* JSON Input/Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-lg font-semibold text-gray-900 dark:text-white">
                📝 Input JSON
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {inputJson.length.toLocaleString()} characters
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {inputJson.split('\n').length} lines
                </span>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder="Paste your JSON here... 

💡 Pro Tips:
• Use Ctrl+Enter to format
• Use Ctrl+M to minify  
• Use Ctrl+D for dark mode
• Drag & drop JSON files here"
                className="json-textarea w-full h-96 p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                spellCheck="false"
              />
              {/* Line numbers overlay could be added here */}
            </div>
          </div>

          {/* Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-lg font-semibold text-gray-900 dark:text-white">
                {viewMode === 'tree' ? '🌳 Tree View' : '✨ Formatted JSON'}
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {outputJson.length.toLocaleString()} characters
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {outputJson.split('\n').length} lines
                </span>
                {outputJson && (
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {copySuccess ? '✅ Copied!' : '📋 Copy'}
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <textarea
                value={searchTerm ? getDisplayText() : outputJson}
                readOnly
                placeholder="Formatted JSON will appear here...

🎯 Available Actions:
• Format - Pretty print with indentation
• Minify - Remove whitespace  
• Tree View - Hierarchical structure
• Sort Keys - Alphabetically order keys
• Validate - Check JSON syntax
• Statistics - Analyze JSON structure"
                className="json-textarea w-full h-96 p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                spellCheck="false"
              />
              {/* Search highlights are applied via dangerouslySetInnerHTML if needed */}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">⌨️ Keyboard Shortcuts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Format JSON:</span>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl+Enter</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Minify JSON:</span>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl+M</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Clear All:</span>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl+K</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Toggle Dark Mode:</span>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl+D</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Download:</span>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl+S</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Upload File:</span>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl+U</kbd>
            </div>
          </div>
        </div>

        {/* Enhanced Features Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Features & Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🎨 JSON Formatter
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Beautify and format your JSON with customizable indentation (2, 4, or 8 spaces).
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                ✅ Advanced Validator
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Validate JSON syntax with detailed error messages including line and column numbers.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🗜️ Smart Minifier
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compress JSON by removing unnecessary whitespace while preserving data integrity.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🌳 Tree View
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Visualize JSON structure as a hierarchical tree for better understanding of complex data.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🔤 Key Sorting
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Alphabetically sort object keys at all levels for consistent data organization.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                📊 Statistics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Analyze JSON structure: size, depth, item count, data types, and key statistics.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🔍 Search & Highlight
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Search within formatted JSON output with real-time highlighting of matches.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                📁 File Operations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload JSON files directly or download formatted results as .json files.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🔒 Escape/Unescape
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Handle JSON strings with proper escaping/unescaping for various use cases.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Boost productivity with intuitive keyboard shortcuts for all major actions.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🌙 Dark Mode
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Eye-friendly dark theme with persistent user preference storage.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                ↶ History & Undo
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track your JSON editing history with undo/redo functionality.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">💡 Pro Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Performance</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Large JSON files (&gt;1MB) may take a moment to process</li>
                <li>• Use minify for production APIs to reduce payload size</li>
                <li>• Tree view is great for understanding complex structures</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Workflow</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Always validate before using JSON in production</li>
                <li>• Sort keys for consistent data comparison</li>
                <li>• Use escape/unescape when working with JSON strings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
