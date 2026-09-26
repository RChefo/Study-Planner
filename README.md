# Study Planner

<p align="center"><img src="branding/study-planner-logo.png" alt="Study Planner" width="120"></p>

مخطط دراسي متعدد المستخدمين (رفيق الدراسة سابقًا). الواجهة الأمامية تطبيق React (TypeScript + Vite + Tailwind CSS)، وخادم Node.js (Express) يتحقق من تسجيل الدخول عبر Google أو Discord، ويحفظ بيانات كل حساب على حدة في MongoDB Atlas. ملفات PDF والصور تحفظ في GridFS مع فحص ملكية الملف لكل حساب. ملفات المستخدم لا تُرسل إلى قاعدة البيانات قبل تسجيل الدخول.

## الإعداد المحلي

المتطلبات: Node.js 22.22 أو أحدث، مشروع Google Cloud لإعداد تسجيل الدخول، وعنقود MongoDB Atlas.

1. افتح مجلد `study-planner-cloud` في الطرفية.
2. نفّذ `npm install`.
3. انسخ `.env.example` إلى `.env` واملأ الإعدادات محليًا. لا ترسل كلمة مرور Atlas أو `SESSION_SECRET` في المحادثة ولا تضعهما في ملفات الواجهة.
4. في Google Cloud أنشئ OAuth Client من نوع **Web application**، وأضف ضمن Authorized JavaScript origins كلًا من `http://localhost:5173` (خادم التطوير) و`http://localhost:3000` (نسخة الإنتاج المحلية). سيحتاج عنوان النشر النهائي إلى إضافته أيضًا.
5. (اختياري) لتفعيل Discord: في [Discord Developer Portal](https://discord.com/developers/applications) أنشئ تطبيقًا، ومن تبويب **OAuth2** انسخ Client ID وClient Secret إلى `DISCORD_CLIENT_ID` و`DISCORD_CLIENT_SECRET`، وأضف تحت **Redirects** القيمة نفسها المكتوبة في `DISCORD_REDIRECT_URI` حرفيًا (مثل `http://localhost:5173/api/auth/discord/callback` أثناء التطوير). يبقى زر Discord معطلًا حتى تُضبط القيم الثلاث.
6. في Atlas أنشئ مستخدم قاعدة بيانات محدود الصلاحيات، وأضف عنوان IP الخاص بالخادم إلى Network Access.

يكفي ضبط مزوّد دخول واحد على الأقل (Google أو Discord).

لإنشاء سر الجلسة استخدم أمرًا محليًا مثل:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

## التشغيل

| الأمر | الوظيفة |
| --- | --- |
| `npm run dev` | يشغّل الخادم (`server.js` على المنفذ 3000) وخادم Vite (على المنفذ 5173) معًا. افتح `http://localhost:5173`؛ طلبات `/api` تُمرَّر إلى الخادم. |
| `npm run build` | فحص الأنواع ثم بناء الواجهة في مجلد `dist/`. |
| `npm start` | يشغّل الخادم ويقدّم الواجهة المبنية من `dist/` على `http://localhost:3000`. |
| `npm run typecheck` | فحص TypeScript فقط. |
| `npm run lint` | فحص ESLint. |
| `npm test` | كل الاختبارات (الواجهة البرمجية، الأمان، التشغيل والإيقاف، ووحدات الواجهة) — 81 اختبارًا. |
| `npm run security:test` | اختبارات الأمان فقط. |
| `npm run load:test` | اختبار الحمل على خادم محلي (لا يعمل إلا على localhost). |
| `npm run dev:mock-api` | خادم تجريبي بقاعدة بيانات في الذاكرة وتسجيل دخول تجريبي، لتطوير الواجهة بدون MongoDB. لا يعمل مع `NODE_ENV=production`. |

تقرير الأمان والاعتمادية الكامل في [SECURITY-AUDIT.md](SECURITY-AUDIT.md).

## المسارات

| المسار | الصفحة |
| --- | --- |
| `/` | الصفحة التعريفية (يُحوَّل المستخدم المسجَّل مباشرة إلى `/app`) |
| `/login` (و`/login?mode=signup`) | تسجيل الدخول: Google أو Discord أو المتابعة بدون حساب |
| `/auth/callback` | عودة تسجيل Discord ورسائل الأخطاء |
| `/app` | الرئيسية: تقدّم اليوم، الجلسة التالية، الالتزامات القادمة ومحاضرات اليوم |
| `/app/courses`، `/app/courses/:id` | المواد وصفحة كل مادة ومحاضراتها |
| `/app/timetable`، `/app/commitments`، `/app/study-log` | جدول المحاضرات، الالتزامات، سجل المذاكرة |
| `/app/timer`، `/app/stats`، `/app/settings` | المؤقت، الإحصائيات، الإعدادات |
| `/university-timetable` | الجدول الدراسي كصفحة مستقلة |

الروابط القديمة (`/courses` وغيرها) تُحوَّل تلقائيًا إلى مساراتها الجديدة تحت `/app`.

## تسجيل الدخول

- **Google**: زر Google الرسمي (Google Identity Services) يعطي رمز ID يتحقق منه الخادم في `POST /api/auth/google`.
- **Discord**: تدفق OAuth2 على الخادم: `GET /api/auth/discord/start` ← صفحة Discord ← `GET /api/auth/discord/callback` ← `/auth/callback`. يُحمى الطلب بمعامل `state` في ملف تعريف ارتباط قصير العمر، ولا يغادر `DISCORD_CLIENT_SECRET` الخادم.
- كلا المزوّدين يصدران نفس ملف تعريف ارتباط الجلسة الموقَّع (`rafiq_session`). معرّفات حسابات Google بقيت كما هي، وحسابات Discord تُخزَّن بالمعرّف `discord:<id>` فلا تتداخل.

## بنية الواجهة

```
src/
├── App.tsx, main.tsx     نقطة البدء والتحقق من الجلسة
├── routes/               جدول المسارات وحارس اللوحة (RequireSession)
├── layouts/              هيكل لوحة المذاكرة
├── pages/                Landing, Login, AuthCallback, وصفحات اللوحة
├── features/             landing, auth, courses, commitments, study-log, timer, timetable, backup
├── components/           مكونات قابلة لإعادة الاستخدام (brand, ui…)
├── i18n/                 نصوص الصفحات العامة بالعربية والإنجليزية
├── stores/               حالة Zustand (planner, timer, auth, ui)
├── services/             طبقة الـ API، التخزين المحلي (IndexedDB)، المزامنة السحابية
├── assets/branding/      شعار Study Planner (نسخة ويب) وشعار Loolify
├── lib/                  أدوات مساعدة
└── types/                أنواع TypeScript المشتركة
```

الصفحات العامة (التعريفية وتسجيل الدخول) تدعم العربية والإنجليزية مع زر للتبديل؛ لوحة المذاكرة بالعربية. الواجهة لا تقرأ ملف `.env`؛ تحصل على إعدادات المزوّدين من `GET /api/config` وقت التشغيل.

## الهوية البصرية

- `branding/study-planner-logo.png`: الشعار الأصلي (1313×1198، شفاف) — المصدر الرئيسي، لا يُعدَّل.
- `src/assets/branding/study-planner-logo.webp`: نسخة ويب مصغّرة من الشعار نفسه (480px)، و`public/favicon.png` و`public/apple-touch-icon.png` مشتقة منه.
- `src/assets/branding/loolify-logo-typo-black.svg`: شعار Loolify الرسمي (نسخة أحادية اللون من حزمة الهوية) لعبارة «طُوِّر بواسطة Loolify». لا يحتوي على رابط لأن حزمة الهوية لا تتضمن موقعًا رسميًا لـ Loolify.

## طريقة حفظ البيانات

- لكل حساب (Google أو Discord) سجل مستقل في `plannerData`؛ وتحدد هوية المستخدم من الجلسة التي يصدرها الخادم بعد التحقق.
- بيانات المواد والمحاضرات والالتزامات وسجل المذاكرة تُزامن تلقائيًا بعد التغيير، مع بقاء الحفظ المحلي (IndexedDB) كنسخة عمل احتياطية. مفاتيح التخزين المحلي لم تتغير، فالبيانات المحفوظة من النسخة السابقة تظهر كما هي.
- عند أول دخول، إذا وُجدت بيانات محلية على الجهاز، يسألك الموقع قبل نقلها إلى الحساب.
- ملفات PDF تُرفع مرة واحدة إلى GridFS، وتُحفظ مراجعها في بيانات الخطة بدل وضع الملف داخل مستند MongoDB.
- زر Excel يظل متاحًا كنسخة احتياطية مستقلة عن المزامنة، ومتوافقًا مع ملفات النسخ السابقة.

## الأمان والاعتمادية

- تحقق من كل المدخلات (zod)، حدود لحجم الطلبات، وتحديد معدل الطلبات لكل فئة (قابل للضبط من `.env`).
- جلسات قابلة للإلغاء من الخادم، و«تسجيل الخروج من كل الأجهزة».
- رؤوس أمان (CSP وغيرها)، CORS بقائمة أصول صريحة، وفحص الأصل للطلبات المعدِّلة.
- التحقق من نوع ومحتوى الملفات المرفوعة، وحصة تخزين لكل مستخدم.
- أخطاء آمنة ومنظمة، سجلات JSON بدون أسرار، ‏`/api/health` و`/api/health/ready`، وإيقاف هادئ للخادم.

خلف خادم وكيل (reverse proxy) اضبط `TRUST_PROXY=1` حتى يعمل تحديد المعدل حسب عنوان المستخدم الحقيقي. التفاصيل في [SECURITY-AUDIT.md](SECURITY-AUDIT.md).

## النشر

ابنِ الواجهة بـ `npm run build` ثم شغّل `npm start` على خدمة تستضيف Node.js (أو استخدم `Dockerfile` المرفق الذي يبني الواجهة ويشغّل الخادم). اجعل الواجهة وواجهات `/api` على نفس النطاق مع HTTPS. أضف `GOOGLE_CLIENT_ID` و`MONGODB_URI` و`MONGODB_DATABASE` و`SESSION_SECRET` (و`DISCORD_CLIENT_ID` و`DISCORD_CLIENT_SECRET` و`DISCORD_REDIRECT_URI` لتفعيل Discord) كمتغيرات بيئة سرية في خدمة الاستضافة، واضبط `NODE_ENV=production`. أضف نطاق HTTPS إلى Authorized JavaScript origins في Google Cloud، وأضف `https://your-domain/api/auth/discord/callback` إلى Redirects في Discord، واضبط Atlas Network Access على عناوين خادم الاستضافة.

الواجهة القديمة (ملفات HTML قبل الانتقال إلى React) محفوظة في مجلد `legacy/` للرجوع إليها فقط، ولا تُبنى ولا تُقدَّم.
