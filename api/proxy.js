// api/proxy.js  (Vercel Edge Function)
// پرامپت و ساختار خروجی هوش مصنوعی فقط اینجا (سمت سرور) قرار دارد و در مرورگر دیده نمی‌شود.

export const config = {
  runtime: 'edge',
};

const MAX_TEXT = 60000;          // حداکثر طول هر متن ورودی (کاراکتر)
const RATE_LIMIT = 15;           // حداکثر درخواست در هر پنجره برای هر IP
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();          // محدودیت ساده در حافظه (در هر instance)

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT;
}

function buildPayload(input) {
  const currentMethod = input.mode === 'separate' ? 'separate' : 'unified';
  const khutbah1Text = String(input.khutbah1Text || '').slice(0, MAX_TEXT);
  const khutbah2Text = String(input.khutbah2Text || '').slice(0, MAX_TEXT);
  const unifiedText = String(input.unifiedText || '').slice(0, MAX_TEXT);
  if (currentMethod === 'separate' ? (!khutbah1Text && !khutbah2Text) : !unifiedText) return null;

        const summaryLengthValue = input.summaryLength;
        let lengthInstruction = "";
        if (summaryLengthValue === "short") {
            lengthInstruction = "خلاصه خطبه اول و دوم به صورت کاملاً فشرده و کوتاه (هر کدام ۲ الی ۳ بند بسیار کوتاه) باشد.";
        } else if (summaryLengthValue === "long") {
            lengthInstruction = "خلاصه خطبه اول و دوم به صورت بسیار مفصل، جامع و با جزئیات کامل (هر کدام ۵ الی ۶ بند طولانی) باشد.";
        } else {
            lengthInstruction = "خلاصه خطبه اول و دوم به صورت متعادل و استاندارد (هر کدام ۳ الی ۴ بند متوسط) باشد.";
        }


        let prompt = "";
        if (currentMethod === 'separate') {
            prompt = `
                شما یک دستیار متخصص در خلاصه‌سازی و تحلیل محتوای خطبه‌های نماز جمعه هستید.
                متن خطبه اول: ${khutbah1Text}
                متن خطبه دوم: ${khutbah2Text}
                دستورالعمل‌ها:
                1. فرمت خلاصه سازی خطبه‌ها: ${lengthInstruction}
                2. impactfulTitle: تیتر کلی، تاثیرگذار و جذاب (یک جمله کوتاه).
                3. khutbah1.title: تیتر اختصاصی خطبه اول (۲ تا ۴ کلمه).
                4. khutbah1.summary: خلاصه خطبه اول (مذهبی/اخلاقی) بر اساس ساختار طولی بالا (شامل بخش‌های heading و explanation).
                5. khutbah2.title: تیتر اختصاصی خطبه دوم (۲ تا ۴ کلمه).
                6. khutbah2.summary: خلاصه خطبه دوم (سیاسی/اجتماعی) بر اساس ساختار طولی بالا.
                7. overallSummary.title: تیتر اختصاصی، خلاقانه و جذاب برای بخش خلاصه نهایی این هفته (اکیداً تأکید می‌شود که فقط نام تیتر تولیدشده به صورت پویا نوشته شود و به هیچ وجه نباید از عبارات ثابت و کلیشه‌ای مانند "خلاصه خطبه‌های نماز جمعه" یا "خلاصه خطبه ها" استفاده کنید. تیتری بنویسید که جذابیت رسانه‌ای داشته باشد و تلفیقی خلاقانه از موضوع اصلی دو خطبه باشد).
                8. overallSummary.text: خلاصه کلی و تلفیقی خطبه‌ها به زبان فارسی با ساختار دقیق زیر که طول کل آن (از کلمه 'به گزارش' تا انتهای نقطه پایان) به هیچ وجه از ۴۹۹ کاراکتر بیشتر نشود (حداکثر ۴۹۹ کاراکتر شامل فواصل، علائم نگارشی و حروف باشد، این یک محدودیت سیستمی بسیار سخت‌گیرانه است):
                "به گزارش معاونت ارتباطات و رسانه دفتر امام جمعه دهستان میانکاله، حجت‌الاسلام والمسلمین حاج حسین انزائی در خطبه اول [خلاصه بسیار کوتاه خطبه اول] (که حتماً با کلماتی مانند تأکید نمود، دانست، مطرح کرد، بیان داشت به پایان برسد) و در خطبه دوم [خلاصه بسیار کوتاه خطبه دوم] (که حتماً با کلماتی مانند تأکید نمود، دانست، مطرح کرد، بیان داشت، خاطرنشان ساخت به پایان برسد)."
                9. religiousQuote: یک بخش یا فراز مستقل، طولانی و تأثیرگذار (حدود ۲ الی ۳ جمله کامل) که دقیقا و بدون هیچگونه تغییر در جمله‌بندی یا تغییر در معنی، مستقیماً از خود متن خطبه اولِ واردشده برداشته شده باشد. شما به هیچ وجه مجاز به خلاصه کردن یا بازنویسی این جملات نیستید؛ جملات باید با همان لحن و ساختار اصلی خطبه اول باشند و فقط مجاز هستید غلط‌های املایی، غلط‌های نگارشی و علائم دستوری (ویرگول، نقطه و...) را روی آن اصلاح کنید تا برای درج روی تصویر خطبه‌نگاشت مذهبی کاملاً روان و صحیح باشد.
                10. politicalQuote: یک بخش یا فراز مستقل، طولانی و حماسی (حدود ۲ الی ۳ جمله کامل) که دقیقا و بدون هیچگونه تغییر در جمله‌بندی یا تغییر در معنی، مستقیماً از خود متن خطبه دومِ واردشده برداشته شده باشد. شما به هیچ وجه مجاز به خلاصه کردن یا بازنویسی این جملات نیستید؛ جملات باید با همان لحن و ساختار اصلی خطبه دوم باشند و فقط مجاز هستید غلط‌های املایی، غلط‌های نگارشی و علائم دستوری را روی آن اصلاح کنید تا برای درج روی تصویر خطبه‌نگاشت سیاسی کاملاً روان و صحیح باشد.
                فقط JSON برگردان.
            `;
        } else {
            prompt = `
                شما یک دستیار متخصص در خلاصه‌سازی و تحلیل محتوای خطبه‌های نماز جمعه هستید.
                متن کامل و یکجای هر دو خطبه: ${unifiedText}
                
                وظیفه بسیار مهم: شما باید خودتان به صورت هوشمند و دقیق، بخش خطبه اول (محتوا و آموزه های مذهبی، اخلاقی، تقوا یا معنوی) و خطبه دوم (مباحث سیاسی روز، مسائل فرهنگی، اجتماعی، بین‌المللی یا استانی) را در متن بالا تشخیص دهید، آن‌ها را تفکیک کنید و سپس عملیات خلاصه سازی را آغاز نمایید.

                دستورالعمل‌ها:
                1. فرمت خلاصه سازی خطبه‌ها: ${lengthInstruction}
                2. impactfulTitle: تیتر کلی، تاثیرگذار و جذاب (یک جمله کوتاه).
                3. khutbah1.title: تیتر اختصاصی خطبه اول که تفکیک کردید (۲ تا ۴ کلمه).
                4. khutbah1.summary: خلاصه خطبه اول (مذهبی/اخلاقی) بر اساس ساختار طولی بالا (شامل بخش‌های heading و explanation).
                5. khutbah2.title: تیتر اختصاصی خطبه دوم که تفکیک کردید (۲ تا ۴ کلمه).
                6. khutbah2.summary: خلاصه خطبه دوم (سیاسی/اجتماعی) بر اساس ساختار طولی بالا.
                7. overallSummary.title: تیتر اختصاصی، خلاقانه و جذاب برای بخش خلاصه نهایی این هفته (اکیداً تأکید می‌شود که فقط نام تیتر تولیدشده به صورت پویا نوشته شود و به هیچ وجه نباید از عبارات ثابت و کلیشه‌ای مانند "خلاصه خطبه‌های نماز جمعه" یا "خلاصه خطبه ها" استفاده کنید. تیتری بنویسید که جذابیت رسانه‌ای داشته باشد و تلفیقی خلاقانه از موضوع اصلی دو خطبه باشد).
                8. overallSummary.text: خلاصه کلی و تلفیقی خطبه‌ها به زبان فارسی با ساختار دقیق زیر که طول کل آن (از کلمه 'به گزارش' تا انتهای نقطه پایان) به هیچ وجه از ۴۹۹ کاراکتر بیشتر نشود (حداکثر ۴۹۹ کاراکتر شامل فواصل، علائم نگارشی و حروف باشد، این یک محدودیت سیستمی بسیار سخت‌گیرانه است):
                "به گزارش معاونت ارتباطات و رسانه دفتر امام جمعه دهستان میانکاله، حجت‌الاسلام والمسلمین حاج حسین انزائی در خطبه اول [خلاصه بسیار کوتاه خطبه اول] (که حتماً با کلماتی مانند تأکید نمود، دانست، مطرح کرد، بیان داشت به پایان برسد) و در خطبه دوم [خلاصه بسیار کوتاه خطبه دوم] (که حتماً با کلماتی مانند تأکید نمود، دانست، مطرح کرد، بیان داشت، خاطرنشان ساخت به پایان برسد)."
                9. religiousQuote: یک بخش یا فراز مستقل، طولانی و تأثیرگذار (حدود ۲ الی ۳ جمله کامل) که دقیقا و بدون هیچگونه تغییر در جمله‌بندی، مستقیماً از بخش مذهبی (خطبه اول) متن واردشده بالا برداشته شده باشد. شما به هیچ وجه مجاز به خلاصه کردن یا بازنویسی این جملات نیستید؛ جملات باید با همان لحن و ساختار اصلی خطبه باشند و فقط مجاز هستید غلط‌های املایی، غلط‌های نگارشی و علائم دستوری (ویرگول، نقطه و...) را روی آن اصلاح کنید تا برای درج روی تصویر خطبه‌نگاشت مذهبی کاملاً روان و صحیح باشد.
                10. politicalQuote: یک بخش یا فراز مستقل، طولانی و حماسی (حدود ۲ الی ۳ جمله کامل) که دقیقا و بدون هیچگونه تغییر در جمله‌بندی، مستقیماً از بخش سیاسی/اجتماعی (خطبه دوم) متن واردشده بالا برداشته شده باشد. شما به هیچ وجه مجاز به خلاصه کردن یا بازنویسی این جملات نیستید؛ جملات باید با همان لحن و ساختار اصلی خطبه دوم باشند و فقط مجاز هستید غلط‌های املایی، غلط‌های نگارشی و علائم دستوری را روی آن اصلاح کنید تا برای درج روی تصویر خطبه‌نگاشت سیاسی کاملاً روان و صحیح باشد.
                فقط JSON برگردان.
            `;
        }

        const schema = {
            type: "OBJECT", properties: {
                "impactfulTitle": { "type": "STRING" },
                "khutbah1": { "type": "OBJECT", "properties": { "title": { "type": "STRING" }, "summary": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "heading": { "type": "STRING" }, "explanation": { "type": "STRING" } }, "required": ["heading", "explanation"] } } }, "required": ["title", "summary"] },
                "khutbah2": { "type": "OBJECT", "properties": { "title": { "type": "STRING" }, "summary": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "heading": { "type": "STRING" }, "explanation": { "type": "STRING" } }, "required": ["heading", "explanation"] } } }, "required": ["title", "summary"] },
                "overallSummary": { "type": "OBJECT", "properties": { "title": { "type": "STRING" }, "text": { "type": "STRING" } }, "required": ["title", "text"] },
                "religiousQuote": { "type": "STRING" },
                "politicalQuote": { "type": "STRING" }
            }, "required": ["impactfulTitle", "khutbah1", "khutbah2", "overallSummary", "religiousQuote", "politicalQuote"]
        };

  return { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } };
}

export default async function handler(req) {
  // فقط درخواست هم‌دامنه (خود سایت شما) مجاز است؛ هدر CORS باز (*) حذف شد.
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'متد مجاز نیست' }), { status: 405, headers });
  }

  if (origin) {
    let ok = false;
    try { ok = new URL(origin).host === host; } catch {}
    if (!ok) return new Response(JSON.stringify({ error: 'دسترسی غیرمجاز' }), { status: 403, headers });
  }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'تعداد درخواست‌ها زیاد است. لطفاً چند دقیقه بعد دوباره تلاش کنید.' }), { status: 429, headers });
  }

  try {
    const input = await req.json();
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'کلید GOOGLE_API_KEY در متغیرهای هاست تنظیم نشده است.' }), { status: 500, headers });
    }

    const body = buildPayload(input || {});
    if (!body) {
      return new Response(JSON.stringify({ error: 'متن ورودی خالی است.' }), { status: 400, headers });
    }

    // نام مدل را در صورت نیاز با مدل معتبر فعلی گوگل جایگزین کنید
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
      return new Response(JSON.stringify({ error: 'پاسخ دریافتی از گوگل JSON معتبر نبود.' }), { status: 502, headers });
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
