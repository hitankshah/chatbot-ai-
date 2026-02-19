// frontend/src/pages/ChatbotDetail.jsx
// Individual chatbot management page

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatbotsAPI, scrapeAPI } from '../services/api';

export default function ChatbotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [trainedContent, setTrainedContent] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [rawTitle, setRawTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchChatbot();
  }, [id]);

  const fetchChatbot = async () => {
    try {
      const data = await chatbotsAPI.get(id);
      setChatbot(data.chatbot);
      setTrainedContent(data.trainedContent);
      setConversations(data.recentConversations);
      setTotalConversations(data.totalConversations || 0);
      setEmbedCode(data.embedCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!scrapeUrl) return;

    setScraping(true);
    try {
      await scrapeAPI.start(id, scrapeUrl);
      setScrapeUrl('');
      // Refresh after short delay
      setTimeout(fetchChatbot, 2000);
      alert('Scraping started! This may take a few minutes.');
    } catch (err) {
      alert('Scraping failed: ' + err.message);
    } finally {
      setScraping(false);
    }
  };

  const handleRawTextTrain = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setScraping(true);
    try {
      await scrapeAPI.trainRawText(id, rawText, rawTitle || 'Manual Notes');
      setRawText('');
      setRawTitle('');
      setTimeout(fetchChatbot, 2000);
      alert('Raw text training started.');
    } catch (err) {
      alert('Raw text training failed: ' + err.message);
    } finally {
      setScraping(false);
    }
  };

  const handleSitemapTrain = async (e) => {
    e.preventDefault();
    if (!sitemapUrl) return;

    setScraping(true);
    try {
      await scrapeAPI.trainSitemap(id, sitemapUrl, 30);
      setSitemapUrl('');
      setTimeout(fetchChatbot, 2000);
      alert('Sitemap training started.');
    } catch (err) {
      alert('Sitemap training failed: ' + err.message);
    } finally {
      setScraping(false);
    }
  };

  const handleFileTrain = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setScraping(true);
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result || '';
          const encoded = String(result).split(',')[1] || '';
          resolve(encoded);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });

      await scrapeAPI.trainUpload(id, uploadFile.name, uploadFile.type, base64Data);
      setUploadFile(null);
      setTimeout(fetchChatbot, 2000);
      alert('File training started.');
    } catch (err) {
      alert('File training failed: ' + err.message);
    } finally {
      setScraping(false);
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">{error}</div>;
  }

  if (!chatbot) return null;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'train', label: 'Train' },
    { key: 'embed', label: 'Embed Code' },
    { key: 'conversations', label: 'Conversations' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/app/dashboard')} className="text-gray-400 hover:text-gray-600">
          ← Back
        </button>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
          style={{ backgroundColor: chatbot.primary_color }}
        >
          {chatbot.name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{chatbot.name}</h1>
          <p className="text-sm text-gray-500">{chatbot.website_url || 'No website set'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Total Conversations</p>
            <p className="text-3xl font-bold mt-1">{totalConversations}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Trained Pages</p>
            <p className="text-3xl font-bold mt-1">{trainedContent.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-3xl font-bold mt-1 capitalize">{chatbot.status}</p>
          </div>

          <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Bot Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Welcome Message:</span>
                <p className="font-medium">{chatbot.welcome_message}</p>
              </div>
              <div>
                <span className="text-gray-500">Brand Color:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: chatbot.primary_color }}></div>
                  <span className="font-mono text-sm">{chatbot.primary_color}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-500">AI Model:</span>
                <p className="font-medium">{chatbot.model}</p>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <p className="font-medium">{new Date(chatbot.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Train Tab */}
      {activeTab === 'train' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Train on Website</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter a URL to scrape and train your chatbot with that content.
            </p>
            <form onSubmit={handleScrape} className="flex gap-3">
              <input
                type="url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="https://yourwebsite.com/docs"
                required
              />
              <button
                type="submit"
                disabled={scraping}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition whitespace-nowrap"
              >
                {scraping ? 'Scraping...' : 'Start Training'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Train from Sitemap</h3>
            <form onSubmit={handleSitemapTrain} className="flex gap-3">
              <input
                type="url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="https://yourwebsite.com/sitemap.xml"
                required
              />
              <button
                type="submit"
                disabled={scraping}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition whitespace-nowrap"
              >
                Start Sitemap Training
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Train from Raw Text</h3>
            <form onSubmit={handleRawTextTrain} className="space-y-3">
              <input
                type="text"
                value={rawTitle}
                onChange={(e) => setRawTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                placeholder="Content title (optional)"
              />
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                placeholder="Paste FAQs, policies, product documentation..."
                required
              />
              <button
                type="submit"
                disabled={scraping}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition"
              >
                Train from Text
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Train from File</h3>
            <form onSubmit={handleFileTrain} className="space-y-3">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Supported formats: PDF, DOCX, TXT</p>
              <button
                type="submit"
                disabled={scraping || !uploadFile}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition"
              >
                Upload and Train
              </button>
            </form>
          </div>

          {/* Trained content list */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Trained Content</h3>
            {trainedContent.length === 0 ? (
              <p className="text-gray-500 text-sm">No content trained yet. Add a URL above.</p>
            ) : (
              <div className="space-y-3">
                {trainedContent.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{item.page_title || item.url}</p>
                      <p className="text-xs text-gray-500 truncate max-w-md">{item.url}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{item.chunk_count} chunks</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embed Code Tab */}
      {activeTab === 'embed' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Embed Code</h3>
          <p className="text-sm text-gray-500 mb-4">
            Copy this code and paste it before the closing &lt;/body&gt; tag on your website.
          </p>

          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
              {embedCode}
            </pre>
            <button
              onClick={copyEmbedCode}
              className={`absolute top-3 right-3 px-3 py-1.5 rounded text-xs font-medium transition ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900">How it works:</h4>
            <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Copy the embed code above</li>
              <li>Paste it in your website's HTML before &lt;/body&gt;</li>
              <li>A chat bubble will appear on your website</li>
              <li>Visitors can click it to chat with your AI bot</li>
            </ol>
          </div>
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Conversations</h3>
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-sm">No conversations yet. Deploy your chatbot to start receiving messages.</p>
          ) : (
            <div className="space-y-3">
              {conversations.map(conv => (
                <div key={conv.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Session: {conv.session_id.slice(0, 12)}...</span>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {conv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
