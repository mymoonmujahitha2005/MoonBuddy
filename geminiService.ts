import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import JSZip from "jszip";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ProcessedStudyMaterial {
  title: string;
  summary: string;
  notes: string;
  flashcards: { front: string; back: string }[];
  quiz: { question: string; options: string[]; correctAnswer: string }[];
  mindMap: string;
}

function extractJson(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json?\s*([\s\S]*?)\s*```/g, "$1").trim();
  // Find the first { and last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned;
}

function getMimeType(file: File): string {
  if (file.type && file.type !== "") return file.type;
  
  const fileName = file.name.toLowerCase();
  // Documents
  if (fileName.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (fileName.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (fileName.endsWith('.doc')) return 'application/vnd.ms-word';
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.txt')) return 'text/plain';

  // Video
  if (fileName.endsWith('.mp4')) return 'video/mp4';
  if (fileName.endsWith('.webm')) return 'video/webm';
  if (fileName.endsWith('.mov')) return 'video/quicktime';
  if (fileName.endsWith('.mpeg') || fileName.endsWith('.mpg')) return 'video/mpeg';
  if (fileName.endsWith('.avi')) return 'video/x-msvideo';
  if (fileName.endsWith('.mkv')) return 'video/x-matroska';
  
  // Audio
  if (fileName.endsWith('.mp3')) return 'audio/mpeg';
  if (fileName.endsWith('.wav')) return 'audio/wav';
  if (fileName.endsWith('.ogg')) return 'audio/ogg';
  if (fileName.endsWith('.m4a')) return 'audio/mp4';
  
  // Images
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';

  return 'application/octet-stream';
}

async function extractTextFromPptx(file: File): Promise<string> {
  try {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    const slides = Object.keys(content.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
    
    // Sort slides numerically
    slides.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.at(0) || '0');
      const numB = parseInt(b.match(/\d+/)?.at(0) || '0');
      return numA - numB;
    });

    let fullText = "";
    for (const slidePath of slides) {
      const slideXml = await content.file(slidePath)?.async("text");
      if (slideXml) {
        // Simple regex to extract text from <a:t> tags which contain slide text
        const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
        if (textMatches) {
          const slideText = textMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
          fullText += `[Slide ${slides.indexOf(slidePath) + 1}]: ${slideText}\n\n`;
        }
      }
    }
    return fullText || "No text could be extracted from this presentation.";
  } catch (error) {
    console.error("Error extracting PPTX text:", error);
    return "Error extracting presentation text.";
  }
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "No text could be extracted from this document.";
  } catch (error) {
    console.error("Error extracting DOCX text:", error);
    return "Error extracting document text.";
  }
}

export async function processFile(file: File): Promise<ProcessedStudyMaterial> {
  const mimeType = getMimeType(file);
  const isOfficeDoc = mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('word') || mimeType.includes('officedocument.word') || mimeType.includes('ms-word');
  
  // Base64 overhead is ~33%. Gemini API limit for inlineData is strictly 20MB.
  // 14MB * 1.33 = ~18.6MB, which is a safe ceiling.
  const MAX_SIZE_MB = 14;
  if (!isOfficeDoc && file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`The cosmic file size limit is ${MAX_SIZE_MB}MB for direct media uploads due to processing constraints. For larger videos, we recommend the 'YouTube' tab for unlimited size!`);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "undefined" || key === "") {
    console.error("GeminiService: GEMINI_API_KEY is missing.");
    throw new Error("Cosmic connection failure: AI credentials (API Key) are missing from the environment. Please add GEMINI_API_KEY to your project secrets.");
  }

  let contentParts: any[] = [];
  let promptPrefix = "";

  if (isOfficeDoc) {
    console.log("GeminiService: Processing Office document via text extraction...");
    let extractedText = "";
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      extractedText = await extractTextFromPptx(file);
    } else {
      extractedText = await extractTextFromDocx(file);
    }
    promptPrefix = `Below is the text content extracted from a document (${file.name}).\n\n--- EXTRACTED TEXT ---\n${extractedText}\n--- END OF TEXT ---\n\n`;
    contentParts.push({ text: promptPrefix });
  } else {
    console.log(`GeminiService: Processing ${mimeType} via direct stream...`);
    const fileData = await fileToBase64(file);
    contentParts.push({
      inlineData: {
        data: fileData,
        mimeType: mimeType
      }
    });
  }

  const isMultimedia = mimeType.includes('video') || mimeType.includes('audio');

  const prompt = `
    Analyze this ${isMultimedia ? 'multimedia' : 'document'} material and generate a structured study kit.
    ${isMultimedia ? 'Watch the video/Audio content carefully' : 'Read the contents carefully'} and focus on key definitions, concepts, and relationships.
    
    Return a VALID JSON object containing:
    - title: Subject/Topic title
    - summary: 2-3 sentence overview
    - notes: Structured markdown notes (be comprehensive and pedagogical)
    - flashcards: 5 Q&A pairs for active recall
    - quiz: 5 multiple-choice questions with 4 options each
    - mindMap: A hierarchy string (Topic > Subtopic) representing the logical structure
  `;

  contentParts.unshift({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: contentParts
      },
      config: {
        systemInstruction: "You are a professional study assistant. Output only valid JSON. Do not include extra text or commentary.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            notes: { type: Type.STRING },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING }
                },
                required: ["front", "back"]
              }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer"]
              }
            },
            mindMap: { type: Type.STRING }
          },
          required: ["title", "summary", "notes", "flashcards", "quiz", "mindMap"]
        }
      }
    });

    if (!response) {
      throw new Error("The moon remained silent (No response from AI).");
    }
    
    const text = response.text;
    if (!text) {
      throw new Error("The AI returned a hollow response (Empty text).");
    }

    const cleanedText = extractJson(text);
    return JSON.parse(cleanedText) as ProcessedStudyMaterial;
  } catch (err: any) {
    console.error("AI Error:", err);
    // Extract more detail from the error if available
    const detail = err.status || err.name || "Unknown error";
    throw new Error(`AI Processing Error (${detail}): ${err.message || 'The cosmic connection was lost.'}`);
  }
}

export async function processYoutubeUrl(url: string): Promise<ProcessedStudyMaterial> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "undefined" || key === "") {
    throw new Error("Cosmic connection failure: AI credentials (API Key) are missing from the environment.");
  }

  const prompt = `
    Analyze this YouTube video: ${url}
    Generate a structured study kit based on the video content.
    
    Return a VALID JSON object containing:
    - title: Subject/Topic title
    - summary: 2-3 sentence overview
    - notes: Structured markdown notes
    - flashcards: 5 Q&A pairs
    - quiz: 5 multiple-choice questions
    - mindMap: A hierarchy string (Topic > Subtopic)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional study assistant. Output only valid JSON. Do not include extra text or commentary.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            notes: { type: Type.STRING },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING }
                },
                required: ["front", "back"]
              }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer"]
              }
            },
            mindMap: { type: Type.STRING }
          },
          required: ["title", "summary", "notes", "flashcards", "quiz", "mindMap"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("No response from AI.");
    }

    const text = extractJson(response.text);
    return JSON.parse(text) as ProcessedStudyMaterial;
  } catch (err: any) {
    console.error("AI Youtube Error:", err);
    throw err;
  }
}

export async function chatAboutMaterial(material: ProcessedStudyMaterial, query: string, history: { role: 'user' | 'model', content: string }[]) {
  const systemInstruction = `You are MoonBuddy AI. Context:
  Title: ${material.title}
  Summary: ${material.summary}
  Notes: ${material.notes}
  
  Answer strictly based on the provided material.`;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction
    },
    history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] }))
  });

  const result = await chat.sendMessage({ message: query });
  return result.text;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const parts = reader.result?.toString().split(',');
      if (parts && parts.length > 1) {
        resolve(parts[1]);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
