import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

try {
  dotenv.config();
} catch (e) {
  // Direct key use kar rahe hain, toh is error ki tension nahi hai
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ⚠️ HARDCODED API KEY METHOD:
// Niche diye gaye quotes ke andar apni Google AI Studio wali asli key paste kar do
const apiKey = "AIzaSy_PASTE_YOUR_KEY_HERE";

if (!apiKey || apiKey.includes("PASTE_YOUR_KEY")) {
  console.error("CRITICAL ERROR: Please replace 'AIzaSyD1OoEntfKt4B8V3ogyr-g2L4rcK0D-Fwk' with your real Gemini API key!");
}

const genAI = new GoogleGenerativeAI(apiKey || "DUMMY_KEY");
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);

  } catch (e) {
    console.error('Generation Error Log:', e.message);
    res.status(500).json({ error: `Generation failed: ${e.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`K Creates backend running on port ${PORT}`);
});
