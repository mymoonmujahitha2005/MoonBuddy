import React, { useState, useEffect } from 'react';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import mammoth from 'mammoth';

interface DocxViewerProps {
  file: File;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({ file }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDocx = async () => {
      try {
        setLoading(true);
        setError(null);
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setContent(result.value);
      } catch (err) {
        console.error('DOCX Render Error:', err);
        setError('The moon encountered a gravitational anomaly while reading this document.');
      } finally {
        setLoading(false);
      }
    };

    renderDocx();
  }, [file]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-slate-800/10">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Deciphering Document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-slate-800/10 text-center">
        <AlertCircle className="text-red-400 mb-4" size={40} />
        <p className="text-white font-bold text-sm mb-2">{error}</p>
        <p className="text-slate-500 text-xs">Try re-uploading or using a PDF version.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-white p-8 sm:p-12 text-slate-900 border-none rounded-none shadow-inner custom-scrollbar">
      <div 
        className="docx-content prose prose-slate max-w-none 
          prose-headings:text-indigo-950 prose-headings:font-black 
          prose-p:text-slate-700 prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    </div>
  );
};
