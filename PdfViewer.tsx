import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
// Use the distributed worker from the package
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure worker using the local package source via Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerProps {
  url?: string;
  file?: File | null;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, file }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderPdf = async () => {
      if (!url && !file) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let pdfData: ArrayBuffer;
        if (file) {
          pdfData = await file.arrayBuffer();
        } else if (url) {
          const response = await fetch(url);
          pdfData = await response.arrayBuffer();
        } else {
          return;
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          // Render first 5 pages for preview
          const pagesToRender = Math.min(pdf.numPages, 10);
          
          for (let i = 1; i <= pagesToRender; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            canvas.className = 'w-full shadow-2xl mb-8 rounded-lg';
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            if (context) {
              await page.render({ 
                canvasContext: context, 
                viewport,
                // Add canvas property if required by newer types
                canvas: canvas as any 
              }).promise;
              containerRef.current.appendChild(canvas);
            }
          }
        }
      } catch (err: any) {
        console.error('PDF Error:', err);
        setError('The celestial alignment for this PDF failed');
      } finally {
        setLoading(false);
      }
    };

    renderPdf();
  }, [url, file]);

  return (
    <div className="w-full h-full bg-slate-900/50 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
      {loading && (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scanning Document...</p>
        </div>
      )}
      
      {error && (
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-red-400">
          <AlertCircle size={32} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="max-w-4xl mx-auto" />
      
      {!loading && !error && numPages && numPages > 10 && (
        <div className="text-center py-8">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {numPages - 10} more pages managed by the moon
          </p>
        </div>
      )}
    </div>
  );
};
