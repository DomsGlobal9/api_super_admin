'use client';

import { use, useEffect, useState } from 'react';
import { apisClient } from '@/lib/api-client/apis';
import MDEditor from '@uiw/react-md-editor';
import { AlertCircle, Save, Check, Edit3, X, Printer } from 'lucide-react';
import { ApiDTO } from '@/features/apis/api.types';

export default function ApiDocsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [api, setApi] = useState<ApiDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<string | undefined>('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function loadApi() {
      try {
        const data = await apisClient.getApiById(id);
        setApi(data);
        setContent(data.documentation || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadApi();
  }, [id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccessMessage('');
      await apisClient.updateApi(id, { documentation: content });
      setSuccessMessage('Documentation saved successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save documentation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading documentation...</div>;
  if (!api) return <div className="p-8">API not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">API Documentation</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Write markdown documentation for your developers. This content will be displayed on the client-facing API catalog.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {successMessage && (
            <span className="inline-flex items-center text-sm text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-right-4">
              <Check className="w-4 h-4 mr-1" />
              {successMessage}
            </span>
          )}
          {!isEditing ? (
            <>
              {content && (
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors print:hidden"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print / Save PDF
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Docs
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setContent(api.documentation || '');
                }}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || content === api.documentation}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden" data-color-mode="light">
        {isEditing ? (
          <MDEditor
            value={content}
            onChange={setContent}
            height={600}
            className="border-0 !rounded-none"
            previewOptions={{
              className: "prose dark:prose-invert max-w-none p-4"
            }}
          />
        ) : (
          <div id="printable-docs" className="p-8 min-h-[400px]">
            {content ? (
              <MDEditor.Markdown source={content} className="prose dark:prose-invert max-w-none" />
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No documentation exists for this API yet.</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Write Documentation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isEditing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Markdown Supported</p>
            <p>You can use standard markdown syntax including tables, code blocks, and links. Preview your changes on the right pane before saving.</p>
          </div>
        </div>
      )}
    </div>
  );
}
