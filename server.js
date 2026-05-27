import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize Latest Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FREE_LIMIT = 5;
const usageMap = {};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

app.get('/health', (req, res) => {
  res.json({ status: 'K Creates Backend Live!' });
});

app.post('/generate', async (req, res) => {
  try {
    const { style, software, ratio, mood, length, customInput, isPaid } = req.body;

    if (!style) {
      return res.status(400).json({ error: 'Style is required!' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!isPaid) {
      const key = `${ip}_${getToday()}`;
      usageMap[key] = (usageMap[key] || 0) + 1;
      if (usageMap[key] > FREE_LIMIT) {
        return res.status(429).json({
          error: 'Daily limit reached! Upgrade to Pro.',
          limitReached: true
        });
      }
    }

    const prompt = `You are an expert motion graphics designer. Generate premium motion graphics prompts.
Style: ${style}
Software: ${software || 'Alight Motion'}
Aspect Ratio: ${ratio || '9:16'}
Color Mood: ${mood || 'Dark'}
Prompt Type: ${length || 'Detailed'}
${customInput ? 'Extra details: ' + customInput : ''}

Respond ONLY in this exact JSON format, no extra text:
{"bg_prompt":"detailed background prompt here","video_prompt":"cinematic animation prompt here","color_palette":["#hex1","#hex2","#hex3","#hex4"],"pro_tip":"one expert tip here"}`;

    // gemini-2.5-flash use kar rahe hain jo fast aur stable hai
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    const text = response.text;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: 'Generation failed. Try again!' });
  }
});

app.listen(PORT, () => {
  console.log(`K Creates backend running on port ${PORT}`);
});
  
