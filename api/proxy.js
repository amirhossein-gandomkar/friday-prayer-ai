// api/proxy.js

export const config = {
  runtime: 'edge', // اجرای سریع
};

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'متد مجاز نیست' }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'کلید GOOGLE_API_KEY در متغیرهای هاست تنظیم نشده است.' }), { status: 500, headers });
    }

    // تغییر نام مدل از 2.5 به نسخه معتبر و پرسرعت 1.5 یا 2.0
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const googleResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const responseText = await googleResponse.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return new Response(JSON.stringify({ error: 'پاسخ دریافتی از گوگل JSON معتبر نبود: ' + responseText }), { status: 502, headers });
    }

    if (!googleResponse.ok) {
      const errMsg = data.error?.message || 'خطا در ارتباط با هوش مصنوعی گوگل';
      return new Response(JSON.stringify({ error: errMsg }), { status: googleResponse.status, headers });
    }

    return new Response(JSON.stringify(data), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطای سرور پروکسی: ' + error.message }), { status: 500, headers });
  }
}
