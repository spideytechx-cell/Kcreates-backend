const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ⬇️ YAHAN APNI GEMINI API KEY DAALO
const GEMINI_API_KEY = AIzaSyBkHJhnzIiyYFzfwOmDsjn_QFI6G6WD88E;

const FREE_LIMIT = 5;
const usageMap = {};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function checkLimit(ip) {
  const key = `${ip}_${getToday()}`;
  usageMap[key] = (usageMap[key] || 0) + 1;
  return usageMap[key];
}

app.post('/generate', async (req, res) => {
  const { style, software, ratio, mood, length, customInput, isPaid } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!isPaid) {
    const count = checkLimit(ip);
    if (count > FREE_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily limit reached! Upgrade to Pro for unlimited prompts.', 
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
${customInput ? 'Extra details: ' + customInput : ''}

Respond ONLY in valid JSON:
{
  "bg_prompt": "Detailed background prompt...",
  "video_prompt": "Cinematic animation prompt...",
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "pro_tip": "One expert tip"
}`;

  try {
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
    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({ 
      ...parsed, 
      isPaid, 
      promptsUsed: usageMap[`${ip}_${getToday()}`] || 1 
    });
  } catch (e) {
    res.status(500).json({ error: 'Generation failed. Try again!' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'K Creates Backend Live!' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`K Creates backend running on port ${PORT}`));
