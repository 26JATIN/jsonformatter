'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import yaml from 'js-yaml';
import { parseString as xmlParser, Builder as XmlBuilder } from 'xml2js';

export default function UniversalFormatter() {
  const [inputData, setInputData] = useState('');
  const [outputData, setOutputData] = useState('');
  const [error, setError] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [inputFormat, setInputFormat] = useState('auto');
  const [outputFormat, setOutputFormat] = useState('json');
  const [viewMode, setViewMode] = useState('formatted');
  const [searchTerm, setSearchTerm] = useState('');
  const [formatStats, setFormatStats] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef(null);

  // Auto-convert when input data changes
  useEffect(() => {
    const delayConvert = setTimeout(() => {
      if (inputData.trim()) {
        convertData();
      } else {
        setOutputData('');
        setError('');
        setFormatStats(null);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayConvert);
  }, [inputData, outputFormat, indentSize]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('universal-formatter-dark-mode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('universal-formatter-dark-mode', newMode.toString());
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Add to history
  const addToHistory = useCallback((data) => {
    if (data.trim() && data !== history[history.length - 1]) {
      const newHistory = [...history.slice(-19), data];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history]);

  // Auto-detect input format
  const detectFormat = useCallback((input) => {
    const trimmed = input.trim();
    if (!trimmed) return 'json';
    
    // Try JSON first
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {}
    
    // Try XML
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return 'xml';
    }
    
    // Try YAML
    try {
      yaml.load(trimmed);
      return 'yaml';
    } catch {}
    
    return 'json'; // default
  }, []);

  // Parse input data based on format
  const parseInput = useCallback((input, format) => {
    if (!input.trim()) throw new Error('Input is empty');
    
    switch (format) {
      case 'json':
        return JSON.parse(input);
      case 'yaml':
        return yaml.load(input);
      case 'xml':
        return new Promise((resolve, reject) => {
          xmlParser(input, { 
            explicitArray: false, 
            ignoreAttrs: false,
            mergeAttrs: true 
          }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      default:
        throw new Error('Unsupported input format');
    }
  }, []);

  // Convert data to output format
  const formatOutput = useCallback((data, format) => {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, indentSize);
      case 'yaml':
        return yaml.dump(data, { indent: indentSize, noRefs: true });
      case 'xml':
        const builder = new XmlBuilder({ 
          renderOpts: { 
            pretty: true, 
            indent: ' '.repeat(indentSize) 
          } 
        });
        return builder.buildObject(data);
      default:
        throw new Error('Unsupported output format');
    }
  }, [indentSize]);

  // Calculate data statistics
  const calculateStats = useCallback((dataString, format) => {
    try {
      let parsed;
      if (format === 'json') {
        parsed = JSON.parse(dataString);
      } else if (format === 'yaml') {
        parsed = yaml.load(dataString);
      } else if (format === 'xml') {
        const elementCount = (dataString.match(/<[^\/][^>]*>/g) || []).length;
        const attributeCount = (dataString.match(/\w+="/g) || []).length;
        return {
          size: dataString.length,
          elements: elementCount,
          attributes: attributeCount,
          format: format.toUpperCase()
        };
      }
      
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

      return {
        size: dataString.length,
        depth: calculateDepth(parsed),
        items: countItems(parsed),
        format: format.toUpperCase()
      };
    } catch {
      return null;
    }
  }, []);

  // Main conversion function
  const convertData = useCallback(async () => {
    try {
      if (!inputData.trim()) {
        setError('Please enter data to convert');
        setOutputData('');
        setFormatStats(null);
        return;
      }

      const detectedFormat = inputFormat === 'auto' ? detectFormat(inputData) : inputFormat;
      
      let parsed;
      
      if (detectedFormat === 'xml') {
        parsed = await parseInput(inputData, detectedFormat);
      } else {
        parsed = parseInput(inputData, detectedFormat);
      }

      const formatted = formatOutput(parsed, outputFormat);
      
      setOutputData(formatted);
      setError('');
      setFormatStats(calculateStats(inputData, detectedFormat));
      addToHistory(inputData);
      
    } catch (err) {
      setError(`Invalid ${inputFormat.toUpperCase()}: ${err.message}`);
      setOutputData('');
      setFormatStats(null);
    }
  }, [inputData, inputFormat, outputFormat, detectFormat, parseInput, formatOutput, calculateStats, addToHistory]);

  // Minify data
  const minifyData = useCallback(async () => {
    try {
      if (!inputData.trim()) {
        setError('Please enter data to minify');
        setOutputData('');
        setFormatStats(null);
        return;
      }

      const detectedFormat = inputFormat === 'auto' ? detectFormat(inputData) : inputFormat;
      let parsed;
      
      if (detectedFormat === 'xml') {
        parsed = await parseInput(inputData, detectedFormat);
      } else {
        parsed = parseInput(inputData, detectedFormat);
      }

      let minified;
      if (outputFormat === 'json') {
        minified = JSON.stringify(parsed);
      } else if (outputFormat === 'yaml') {
        minified = yaml.dump(parsed, { flowLevel: 0, noRefs: true });
      } else if (outputFormat === 'xml') {
        const builder = new XmlBuilder({ renderOpts: { pretty: false } });
        minified = builder.buildObject(parsed);
      }
      
      setOutputData(minified);
      setError('');
      setFormatStats(calculateStats(inputData, detectedFormat));
      addToHistory(inputData);
    } catch (err) {
      setError(`Invalid ${inputFormat.toUpperCase()}: ${err.message}`);
      setOutputData('');
      setFormatStats(null);
    }
  }, [inputData, inputFormat, outputFormat, detectFormat, parseInput, calculateStats, addToHistory]);

  // Validate data
  const validateData = useCallback(async () => {
    try {
      if (!inputData.trim()) {
        setError('Please enter data to validate');
        setFormatStats(null);
        return;
      }

      const detectedFormat = inputFormat === 'auto' ? detectFormat(inputData) : inputFormat;
      let parsed;
      
      if (detectedFormat === 'xml') {
        parsed = await parseInput(inputData, detectedFormat);
      } else {
        parsed = parseInput(inputData, detectedFormat);
      }

      const stats = calculateStats(inputData, detectedFormat);
      setFormatStats(stats);
      
      if (stats) {
        setError(`✅ Valid ${detectedFormat.toUpperCase()} - ${stats.items || stats.elements || 0} items, ${stats.depth || 0} levels deep`);
      } else {
        setError(`✅ Valid ${detectedFormat.toUpperCase()}`);
      }
    } catch (err) {
      setError(`❌ Invalid ${inputFormat.toUpperCase()}: ${err.message}`);
      setFormatStats(null);
    }
  }, [inputData, inputFormat, detectFormat, parseInput, calculateStats]);

  // Clear all
  const clearAll = useCallback(() => {
    setInputData('');
    setOutputData('');
    setError('');
    setFormatStats(null);
    setSearchTerm('');
    setViewMode('formatted');
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    if (outputData) {
      try {
        await navigator.clipboard.writeText(outputData);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [outputData]);

  // Generate tree view
  const generateTreeView = useCallback(async () => {
    try {
      if (!inputData.trim()) {
        setError('Please enter data to view as tree');
        setOutputData('');
        setFormatStats(null);
        return;
      }

      const detectedFormat = inputFormat === 'auto' ? detectFormat(inputData) : inputFormat;
      let parsed;
      
      if (detectedFormat === 'xml') {
        parsed = await parseInput(inputData, detectedFormat);
      } else {
        parsed = parseInput(inputData, detectedFormat);
      }

      const treeView = generateDataTree(parsed);
      setOutputData(treeView);
      setViewMode('tree');
      setError('');
      setFormatStats(calculateStats(inputData, detectedFormat));
      addToHistory(inputData);
    } catch (err) {
      setError(`Invalid ${inputFormat.toUpperCase()}: ${err.message}`);
      setOutputData('');
      setFormatStats(null);
    }
  }, [inputData, inputFormat, detectFormat, parseInput, calculateStats, addToHistory]);

  // Helper function to generate tree view
  const generateDataTree = (obj, prefix = '', isLast = true) => {
    let result = '';
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        result += `${prefix}├── Array[${obj.length}]\n`;
        obj.forEach((item, index) => {
          const isLastItem = index === obj.length - 1;
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          result += generateDataTree(item, newPrefix, isLastItem);
        });
      } else {
        const keys = Object.keys(obj);
        keys.forEach((key, index) => {
          const isLastItem = index === keys.length - 1;
          const connector = isLastItem ? '└── ' : '├── ';
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            result += `${prefix}${connector}${key}:\n`;
            result += generateDataTree(obj[key], newPrefix, isLastItem);
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

  // Enhanced Escape/Unescape data for different formats
  const escapeData = useCallback(() => {
    try {
      if (!inputData.trim()) {
        setError('Please enter data to escape');
        setOutputData('');
        return;
      }

      let escaped;
      const detectedFormat = inputFormat === 'auto' ? detectFormat(inputData) : inputFormat;
      
      switch (detectedFormat) {
        case 'json':
          // JSON string escaping
          escaped = JSON.stringify(inputData);
          break;
          
        case 'xml':
          // XML/HTML entity encoding
          escaped = inputData
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          break;
          
        case 'yaml':
          // YAML string escaping (for strings with special chars)
          if (inputData.includes('\n') || inputData.includes('"') || inputData.includes('\\') || 
              inputData.includes(':') || inputData.includes('#') || inputData.includes('-') ||
              inputData.match(/^\s/) || inputData.match(/\s$/)) {
            escaped = JSON.stringify(inputData); // Use JSON-style escaping for complex strings
          } else {
            escaped = `"${inputData}"`; // Simple quote wrapping
          }
          break;
          
        default:
          escaped = JSON.stringify(inputData);
      }
      
      setOutputData(escaped);
      setError(`✅ Data escaped for ${detectedFormat.toUpperCase()} format`);
    } catch (err) {
      setError('Error escaping data: ' + err.message);
      setOutputData('');
    }
  }, [inputData, inputFormat, detectFormat]);

  const unescapeData = useCallback(() => {
    try {
      if (!inputData.trim()) {
        setError('Please enter escaped data to unescape');
        setOutputData('');
        return;
      }

      let unescaped;
      const detectedFormat = inputFormat === 'auto' ? detectFormat(inputData) : inputFormat;
      
      switch (detectedFormat) {
        case 'json':
          // JSON string unescaping
          unescaped = JSON.parse(inputData);
          if (typeof unescaped !== 'string') {
            unescaped = JSON.stringify(unescaped, null, indentSize);
          }
          break;
          
        case 'xml':
          // XML/HTML entity decoding
          unescaped = inputData
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&'); // Do this last to avoid double-decoding
          break;
          
        case 'yaml':
          // YAML string unescaping
          if ((inputData.startsWith('"') && inputData.endsWith('"')) || 
              (inputData.startsWith("'") && inputData.endsWith("'"))) {
            try {
              unescaped = JSON.parse(inputData); // Try JSON parsing first
            } catch {
              unescaped = inputData.slice(1, -1); // Simple quote removal
            }
          } else {
            unescaped = inputData; // Already unescaped
          }
          break;
          
        default:
          unescaped = JSON.parse(inputData);
          if (typeof unescaped !== 'string') {
            unescaped = JSON.stringify(unescaped, null, indentSize);
          }
      }
      
      setOutputData(unescaped);
      setError(`✅ Data unescaped from ${detectedFormat.toUpperCase()} format`);
    } catch (err) {
      setError('Error unescaping data: ' + err.message);
      setOutputData('');
    }
  }, [inputData, inputFormat, indentSize, detectFormat]);

  // Search functionality
  const highlightSearchResults = useCallback(() => {
    if (!searchTerm || !outputData) return outputData;
    
    // Split into lines and mark which lines contain matches
    const lines = outputData.split('\n');
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    return lines.map((line, index) => {
      const hasMatch = searchRegex.test(line);
      return hasMatch ? `→ ${line}` : `  ${line}`;
    }).join('\n');
  }, [outputData, searchTerm]);

  // File upload functionality
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let detectedFormat = 'json';
      
      if (fileExtension === 'json') detectedFormat = 'json';
      else if (fileExtension === 'xml') detectedFormat = 'xml';
      else if (fileExtension === 'yaml' || fileExtension === 'yml') detectedFormat = 'yaml';
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setInputData(e.target.result);
        setInputFormat(detectedFormat);
        setError('');
      };
      reader.onerror = () => setError('Error reading file');
      reader.readAsText(file);
    }
  }, []);

  // File download functionality
  const downloadData = useCallback(() => {
    if (!outputData) {
      setError('No formatted data to download');
      return;
    }

    const getFileExtension = (format) => {
      switch (format) {
        case 'json': return 'json';
        case 'xml': return 'xml';
        case 'yaml': return 'yaml';
        default: return 'txt';
      }
    };

    const getMimeType = (format) => {
      switch (format) {
        case 'json': return 'application/json';
        case 'xml': return 'application/xml';
        case 'yaml': return 'application/x-yaml';
        default: return 'text/plain';
      }
    };

    const blob = new Blob([outputData], { type: getMimeType(outputFormat) });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `converted.${getFileExtension(outputFormat)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [outputData, outputFormat]);

  // Sample data for different formats
  const sampleData = {
    json: `{
  "name": "John Doe",
  "age": 30,
  "city": "New York",
  "isActive": true,
  "hobbies": ["reading", "coding", "swimming"],
  "address": {
    "street": "123 Main St",
    "zipcode": "10001"
  }
}`,
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<person>
  <name>John Doe</name>
  <age>30</age>
  <city>New York</city>
  <isActive>true</isActive>
  <hobbies>
    <hobby>reading</hobby>
    <hobby>coding</hobby>
    <hobby>swimming</hobby>
  </hobbies>
  <address>
    <street>123 Main St</street>
    <zipcode>10001</zipcode>
  </address>
</person>`,
    yaml: `name: John Doe
age: 30
city: New York
isActive: true
hobbies:
  - reading
  - coding
  - swimming
address:
  street: 123 Main St
  zipcode: "10001"`
  };

  const loadSample = useCallback(() => {
    setInputData(sampleData.json); // Always load JSON sample since input is auto-detected
    setError('');
    setOutputData('');
    setFormatStats(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 'm':
            e.preventDefault();
            minifyData();
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
            downloadData();
            break;
          case 'u':
            e.preventDefault();
            fileInputRef.current?.click();
            break;
          case 'v':
            e.preventDefault();
            validateData();
            break;
          case 't':
            e.preventDefault();
            generateTreeView();
            break;
          case 'e':
            e.preventDefault();
            escapeData();
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [minifyData, clearAll, toggleDarkMode, downloadData, validateData, generateTreeView, escapeData]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Universal Format Converter
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Convert between JSON, XML, and YAML formats with advanced formatting and validation
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              >
                <span className="text-lg">
                  {darkMode ? '☀️' : '🌙'}
                </span>
              </button>
              
              {/* File operations */}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,.xml,.yaml,.yml"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="Upload file"
                >
                  📁 Upload
                </button>
                <button
                  onClick={downloadData}
                  disabled={!outputData}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download converted data"
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
        {/* Format Selection */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Output Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Output Format (Auto-detected input)
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
                <option value="yaml">YAML</option>
              </select>
            </div>

            {/* Indent Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Indent Size
              </label>
              <select
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={minifyData}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
              title="Minify the output"
            >
              📦 Minify
            </button>
            <button
              onClick={validateData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
              title="Validate input data"
            >
              ✅ Validate
            </button>
            <button
              onClick={generateTreeView}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
              title="Generate tree view"
            >
              🌳 Tree View
            </button>
            <button
              onClick={escapeData}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm"
              title="Escape data (JSON strings, XML entities, YAML quotes)"
            >
              🔒 Escape
            </button>
            <button
              onClick={unescapeData}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium shadow-sm"
              title="Unescape data (JSON strings, XML entities, YAML quotes)"
            >
              🔓 Unescape
            </button>
            <button
              onClick={loadSample}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium shadow-sm"
              title="Load sample data"
            >
              📝 Sample
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-sm"
              title="Clear all fields"
            >
              🧹 Clear
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg border ${
            error.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            <pre className="whitespace-pre-wrap text-sm font-mono">{error}</pre>
          </div>
        )}

        {/* Statistics */}
        {formatStats && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Size:</span>
                <span className="ml-2 font-mono">{formatStats.size} chars</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Format:</span>
                <span className="ml-2 font-mono">{formatStats.format}</span>
              </div>
              {formatStats.items && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Items:</span>
                  <span className="ml-2 font-mono">{formatStats.items}</span>
                </div>
              )}
              {formatStats.elements && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Elements:</span>
                  <span className="ml-2 font-mono">{formatStats.elements}</span>
                </div>
              )}
              {formatStats.depth && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Depth:</span>
                  <span className="ml-2 font-mono">{formatStats.depth}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        {outputData && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search in Output
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter search term..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Lines containing "{searchTerm}" will be highlighted with →
              </p>
            )}
          </div>
        )}

        {/* Input/Output Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Input (Auto-detected)
              </h2>
            </div>
            <div className="p-4">
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="Enter your data here... Format will be auto-detected (JSON, XML, or YAML)"
                className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Output */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Output ({outputFormat.toUpperCase()})
                </h2>
                
                {/* Format conversion buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setOutputFormat('json')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      outputFormat === 'json'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title="Convert to JSON"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setOutputFormat('xml')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      outputFormat === 'xml'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title="Convert to XML"
                  >
                    XML
                  </button>
                  <button
                    onClick={() => setOutputFormat('yaml')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      outputFormat === 'yaml'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title="Convert to YAML"
                  >
                    YAML
                  </button>
                </div>
              </div>
              
              {outputData && (
                <button
                  onClick={copyToClipboard}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    copySuccess
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {copySuccess ? '✅ Copied' : '📋 Copy'}
                </button>
              )}
            </div>
            <div className="p-4">
              <textarea
                value={searchTerm ? highlightSearchResults() : outputData}
                readOnly
                placeholder="Converted data will appear here automatically..."
                className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                spellCheck="false"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>Universal Format Converter - Auto-detects and converts between JSON, XML, and YAML</p>
          <p className="mt-1">
            Keyboard shortcuts: Minify (Ctrl+M), Validate (Ctrl+V), Tree View (Ctrl+T), Escape (Ctrl+E), Clear (Ctrl+K), Upload (Ctrl+U), Download (Ctrl+S), Dark Mode (Ctrl+D)
          </p>
        </div>
      </div>
    </div>
  );
}
