import React, { useState, useRef } from 'react';
import { Database, Sparkles, Send, Table as TableIcon, AlertCircle, Loader2, Copy, CheckCircle2, Terminal, UploadCloud, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [dbColumns, setDbColumns] = useState([]);
  const [visibleRows, setVisibleRows] = useState(100);
  const fileInputRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/upload-csv', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Upload failed');
      
      setDbColumns(data.columns);
      setQueryResult(null);
      setSqlQuery('');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAndExecute = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setSqlQuery('');
    setQueryResult(null);
    setVisibleRows(100);

    try {
      const genResponse = await fetch('http://localhost:8000/api/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: prompt }),
      });
      
      const genData = await genResponse.json();
      if (!genResponse.ok) throw new Error(genData.detail || 'SQL Generation failed. Did you upload a database?');
      
      const generatedSql = genData.sql_query;
      setSqlQuery(generatedSql);

      const execResponse = await fetch('http://localhost:8000/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql_query: generatedSql }),
      });

      const execData = await execResponse.json();
      if (!execResponse.ok) throw new Error(execData.detail || 'SQL Execution failed');

      setQueryResult(execData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-blue-500/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto px-6 py-12 space-y-8">
        
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-4"
        >
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <Database className="w-10 h-10 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              DataPulse AI
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Natural Language to Database Copilot</p>
          </div>
        </motion.header>

        {/* Database Upload Section (Accepts CSV and Excel) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center space-y-4"
        >
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full border transition-all ${dbColumns.length > 0 ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-300'}`}
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
            <span className="font-medium">
              {uploading ? 'Connecting Database...' : dbColumns.length > 0 ? 'Database Connected' : 'Upload CSV or Excel Database'}
            </span>
          </button>

          {dbColumns.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              <span className="text-xs text-slate-500 self-center w-full text-center mb-1">Available Columns:</span>
              {dbColumns.map((col, idx) => (
                <span key={idx} className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2 py-1 rounded-md flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>{col}</span>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Main Input Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`bg-slate-900/50 backdrop-blur-xl border rounded-3xl p-2 shadow-2xl transition-all ${dbColumns.length > 0 ? 'border-blue-500/30' : 'border-slate-800 opacity-50 pointer-events-none'}`}
        >
          <div className="relative flex items-center">
            <Sparkles className="absolute left-6 w-6 h-6 text-indigo-400" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={dbColumns.length > 0 ? "Ask a question about your uploaded data..." : "Please upload a database file first to enable chat."}
              className="w-full bg-transparent border-none py-6 pl-16 pr-32 text-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAndExecute()}
            />
            <button
              onClick={handleGenerateAndExecute}
              disabled={loading || !prompt.trim()}
              className="absolute right-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white p-3 rounded-xl transition-all duration-200 flex items-center justify-center group"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </motion.div>

        {/* Error Output */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center space-x-3 overflow-hidden"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VERTICAL STACK CONTAINER */}
        <div className="space-y-6">
          
          {/* Generated SQL Code Block (Full Width) */}
          <AnimatePresence>
            {sqlQuery && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
              >
                <div className="flex justify-between items-center px-4 py-3 bg-slate-950/50 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <Terminal className="w-4 h-4" />
                    <span>Generated SQL</span>
                  </div>
                  <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="p-4 bg-slate-950/30">
                  <pre className="font-mono text-sm text-emerald-400 whitespace-pre-wrap break-words">{sqlQuery}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Data Results Table (Full Width with Load More Pagination) */}
          <AnimatePresence>
            {queryResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col"
              >
                <div className="flex items-center px-6 py-4 border-b border-slate-800 bg-slate-950/50 text-slate-300 font-semibold space-x-2">
                  <TableIcon className="w-5 h-5 text-blue-400" />
                  <span>Data Results ({queryResult.length} rows total)</span>
                </div>
                
                <div className="p-0 overflow-x-auto">
                  {queryResult.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">No records matched your query.</div>
                  ) : (
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs tracking-wider">
                        <tr>
                          {Object.keys(queryResult[0]).map((key) => (
                            <th key={key} className="px-6 py-4 font-medium border-b border-slate-800 whitespace-nowrap">{key.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {queryResult.slice(0, visibleRows).map((row, idx) => (
                          <motion.tr 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            transition={{ delay: (idx % 100) * 0.01 }} 
                            key={idx} 
                            className="hover:bg-slate-800/50 transition-colors group"
                          >
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="px-6 py-4 whitespace-nowrap group-hover:text-white transition-colors">
                                {val !== null ? String(val) : <span className="text-slate-600">NULL</span>}
                              </td>
                            ))}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {queryResult.length > visibleRows && (
                  <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-center">
                    <button
                      onClick={() => setVisibleRows((prev) => prev + 100)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all px-6 py-2 rounded-full text-sm font-medium flex items-center space-x-2"
                    >
                      <span>Load More Rows</span>
                      <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
                        Showing {visibleRows} of {queryResult.length}
                      </span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}