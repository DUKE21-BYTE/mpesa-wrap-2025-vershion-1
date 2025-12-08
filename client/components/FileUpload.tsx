import { useState } from 'react';
import axios from 'axios';
import { Upload, Lock, FileText, Clipboard, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FileUpload({ onDataLoaded }: { onDataLoaded: (data: any[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState("");

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("password", password);
    formData.append("file", file);

    setLoading(true);
    setError("");

    try {
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onDataLoaded(res.data.transactions);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to process file");
    } finally {
      setLoading(false);
    }
  };

  const handlePasteProcess = async () => {
    if (!rawText.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post('http://localhost:5000/process-text', { text: rawText });
      onDataLoaded(res.data.transactions);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to process text");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            M-PESA Wrapped
          </h1>
          <p className="text-gray-400">Unlock your financial insights for 2025</p>
        </div>

        <div className="bg-neutral-800/80 backdrop-blur border border-neutral-700 p-8 rounded-2xl shadow-2xl">

          {/* Tabs */}
          <div className="flex bg-neutral-900/50 p-1 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-neutral-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              <Upload className="w-4 h-4" /> Upload PDF
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'paste' ? 'bg-neutral-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              <Clipboard className="w-4 h-4" /> Paste SMS
            </button>
          </div>

          <AnimatePresence mode='wait'>
            {activeTab === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1">Upload M-PESA PDF Statement</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group ${file ? 'border-green-500/50 bg-green-500/5' : 'border-neutral-600 hover:border-neutral-500 hover:bg-neutral-700/30'}`}
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    <input
                      type="file"
                      id="fileInput"
                      className="hidden"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className={`p-3 rounded-full ${file ? 'bg-green-500/20 text-green-400' : 'bg-neutral-700 text-gray-400 group-hover:scale-110 transition-transform'}`}>
                        {file ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                      </div>
                      <p className={`text-sm font-medium ${file ? 'text-green-400' : 'text-gray-400'}`}>
                        {file ? file.name : "Click to select PDF"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> PDF Password <span className="text-neutral-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${!file || loading ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 active:scale-[0.98]'}`}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>Process Statement</>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="paste"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1">Paste M-PESA SMS / Text</label>
                  <textarea
                    className="w-full h-48 bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-sm font-mono resize-none custom-scrollbar"
                    placeholder={`PASTE HERE...\n\nExample:\nQKB12345 Confirmed. Ksh500.00 sent to JOHN DOE...\nPBX98765 Confirmed. You have received Ksh1,200...`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={handlePasteProcess}
                  disabled={!rawText.trim() || loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${!rawText.trim() || loading ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 active:scale-[0.98]'}`}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>Analyze Text</>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Privacy First: Files are processed locally/in-memory and not stored permanently.
        </p>
      </motion.div>
    </div>
  );
}