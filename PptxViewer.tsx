import React, { useState, useEffect } from 'react';
import { Presentation, Loader2, AlertCircle, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import JSZip from 'jszip';

interface PptxViewerProps {
  file: File;
}

interface Slide {
  id: number;
  text: string[];
}

export const PptxViewer: React.FC<PptxViewerProps> = ({ file }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsePptx = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const zip = await JSZip.loadAsync(file);
        const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
        
        // Sort slides by number
        slideFiles.sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
          const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
          return numA - numB;
        });

        const parsedSlides: Slide[] = [];
        const parser = new DOMParser();

        for (let i = 0; i < slideFiles.length; i++) {
          const content = await zip.file(slideFiles[i])?.async('string');
          if (content) {
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            const textNodes = xmlDoc.getElementsByTagName('a:t');
            const slideTexts: string[] = [];
            for (let j = 0; j < textNodes.length; j++) {
              if (textNodes[j].textContent) {
                slideTexts.push(textNodes[j].textContent!);
              }
            }
            parsedSlides.push({
              id: i + 1,
              text: slideTexts
            });
          }
        }

        if (parsedSlides.length === 0) {
          throw new Error('No slides found');
        }

        setSlides(parsedSlides);
      } catch (err) {
        console.error('PPTX Parse Error:', err);
        setError('The moon could not project these slides. Ensure it is a valid .pptx file.');
      } finally {
        setLoading(false);
      }
    };

    parsePptx();
  }, [file]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-slate-800/10">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Aligning Projection Lenses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-slate-800/10 text-center">
        <AlertCircle className="text-red-400 mb-4" size={40} />
        <p className="text-white font-bold text-sm mb-2">{error}</p>
        <p className="text-slate-500 text-xs text-center max-w-xs">{file.name} might be an older .ppt format which is not supported for live preview.</p>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 p-4 sm:p-8 relative">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl aspect-[16/10] bg-slate-900 rounded-2xl border border-white/5 shadow-2xl flex flex-col p-8 sm:p-12 overflow-hidden relative">
          <div className="absolute top-4 left-6 flex items-center gap-2 opacity-20">
             <Presentation size={12} className="text-orange-400" />
             <span className="text-[8px] font-black uppercase tracking-widest text-white">Slide {slide.id}</span>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4">
             {slide.text.length > 0 ? (
               slide.text.map((t, idx) => (
                 <p 
                    key={idx} 
                    className={`${idx === 0 ? 'text-2xl font-black text-white mb-4' : 'text-slate-400 text-sm leading-relaxed'} transition-all`}
                 >
                   {t}
                 </p>
               ))
             ) : (
               <p className="text-slate-600 italic text-center text-xs">No text captured from this slide.</p>
             )}
          </div>
          
          <div className="absolute bottom-4 right-6 text-[8px] font-bold text-slate-700 tracking-[0.3em] uppercase">
            MoonBuddy Insight Engine
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 px-4">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
             disabled={currentSlide === 0}
             className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 disabled:opacity-20 transition-all"
           >
             <ChevronLeft size={20} />
           </button>
           <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
              <span className="text-[10px] font-black text-white tabular-nums tracking-widest">{currentSlide + 1} / {slides.length}</span>
           </div>
           <button 
             onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
             disabled={currentSlide === slides.length - 1}
             className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 disabled:opacity-20 transition-all"
           >
             <ChevronRight size={20} />
           </button>
        </div>
        
        <p className="hidden sm:block text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px]">
           {file.name}
        </p>
      </div>
    </div>
  );
};
