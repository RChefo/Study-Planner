# رفيق الدراسة — نسخة الحسابات والمزامنة

هذه نسخة ويب متعددة المستخدمين من البرنامج الحالي. الواجهة الأمامية تطبيق React (TypeScript + Vite + Tailwind CSS)، وخادم Node.js (Express) يتحقق من تسجيل Google، ويحفظ بيانات كل حساب على حدة في MongoDB Atlas. ملفات PDF والصور تحفظ في GridFS مع فحص ملكية الملف لكل حساب. ملفات المستخدم لا تُرسل إلى قاعدة البيانات قبل تسجيل الدخول.

## الإعداد المحلي

المتطلبات: Node.js 22.22 أو أحدث، مشروع Google Cloud لإعداد تسجيل الدخول، وعنقود MongoDB Atlas.

1. افتح مجلد `study-planner-cloud` في الطرفية.
2. نفّذ `npm install`.
3. انسخ `.env.example` إلى `.env` واملأ الإعدادات محليًا. لا ترسل كلمة مرور Atlas أو `SESSION_SECRET` في المحادثة ولا تضعهما في ملفات الواجهة.
4. في Google Cloud أنشئ OAuth Client من نوع **Web application**، وأضف ضمن Authorized JavaScript origins كلًا من `http://localhost:5173` (خادم التطوير) و`http://localhost:3000` (نسخة الإنتاج المحلية). سيحتاج عنوان النشر النهائي إلى إضافته أيضًا.
5. في Atlas أنشئ مستخدم قاعدة بيانات محدود الصلاحيات، وأضف عنوان IP الخاص بالخادم إلى Network Access.

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

## بنية الواجهة

```
src/
├── App.tsx, main.tsx     نقطة البدء وتشغيل تسجيل الدخول
├── routes/               جدول المسارات (/courses, /timetable, /commitments, /study-log, /university-timetable)
├── layouts/              الهيكل الرئيسي (الرأس، التحية، الإحصاءات، التبويبات)
├── pages/                صفحة لكل تبويب
├── features/             auth, courses, commitments, study-log, timer, timetable, backup
├── components/           مكونات واجهة قابلة لإعادة الاستخدام (أزرار، نوافذ، حقول…)
├── stores/               حالة Zustand (planner, timer, auth, ui)
├── services/             طبقة الاتصال بالـ API، التخزين المحلي (IndexedDB)، المزامنة السحابية
├── lib/                  أدوات مساعدة (تواريخ، ملفات، صوت، مفاتيح التخزين)
└── types/                أنواع TypeScript المشتركة
```

الواجهة لا تقرأ ملف `.env`؛ تحصل على معرف Google من `GET /api/config` وقت التشغيل.

## طريقة حفظ البيانات

- لكل حساب Google سجل مستقل في `plannerData`؛ وتحدد هوية المستخدم من رمز دخول Google الذي يتحقق منه الخادم.
- بيانات المواد والمحاضرات والالتزامات وسجل المذاكرة تُزامن تلقائيًا بعد التغيير، مع بقاء الحفظ المحلي (IndexedDB) كنسخة عمل احتياطية. مفاتيح التخزين المحلي لم تتغير، فالبيانات المحفوظة من النسخة السابقة تظهر كما هي.
- عند أول دخول، إذا وُجدت بيانات محلية على الجهاز، يسألك الموقع قبل نقلها إلى الحساب.
- ملفات PDF تُرفع مرة واحدة إلى GridFS، وتُحفظ مراجعها في بيانات الخطة بدل وضع الملف داخل مستند MongoDB.
- زر Excel يظل متاحًا كنسخة احتياطية مستقلة عن المزامنة، ومتوافقًا مع ملفات النسخ السابقة.

## النشر

ابنِ الواجهة بـ `npm run build` ثم شغّل `npm start` على خدمة تستضيف Node.js (أو استخدم `Dockerfile` المرفق الذي يبني الواجهة ويشغّل الخادم). اجعل الواجهة وواجهات `/api` على نفس النطاق مع HTTPS. أضف `GOOGLE_CLIENT_ID` و`MONGODB_URI` و`MONGODB_DATABASE` و`SESSION_SECRET` كمتغيرات بيئة سرية في خدمة الاستضافة، واضبط `NODE_ENV=production`. أضف نطاق HTTPS إلى Authorized JavaScript origins في Google Cloud، واضبط Atlas Network Access على عناوين خادم الاستضافة.

الواجهة القديمة (ملفات HTML قبل الانتقال إلى React) محفوظة في مجلد `legacy/` للرجوع إليها فقط، ولا تُبنى ولا تُقدَّم.
