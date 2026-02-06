// api/proxy.js

export const config = {
  runtime: 'edge', // استفاده از حالت سریع Edge
};

export default async function handler(req) {
  // تنظیم هدرهای CORS برای اینکه بتوانید از فایل لوکال یا دامین دیگر درخواست بدهید
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // اگر درخواست از نوع OPTIONS بود (چک کردن دسترسی)، سریع تایید کن
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    
    // دریافت کلید API از تنظیمات Vercel (امنیت بالا)
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key not configured on server' }), { status: 500, headers });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // ارسال درخواست به گوگل از سمت سرور Vercel
    const googleResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await googleResponse.json();

    return new Response(JSON.stringify(data), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
