const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FREE_LIMIT = 5;
const usageMap = {};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

app.post('/generate', async (req, res) => {
  try {
    const { style, software, ratio, mood, length, customInput, isPaid } = req.body;
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
Software: ${software}
Aspect Ratio: ${ratio}
Color Mood: ${mood}
Prompt Type: ${length}
${customInput ? 'Extra: ' + customInput : ''}

Respond ONLY in this exact JSON format with no extra text:
{"bg_prompt":"detailed background prompt here","video_prompt":"cinematic animation prompt here","color_palette":["#hex1","#hex2","#hex3","#hex4"],"pro_tip":"one expert tip here"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Gemini API error');
    }

    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: 'Generation failed. Try again!' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'K Creates Backend Live!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`K Creates backend running on port ${PORT}`);
});
