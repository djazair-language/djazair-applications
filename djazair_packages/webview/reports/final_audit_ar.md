# التدقيق النهائي الشامل: وحدة Djazair WebView

| | |
|---|---|
| المشروع | Djazair Language — بيئة سطح المكتب WebView2 |
| المكوّن | `djazair-extensions/webview` (لغة djazair + ملحق C/C++) |
| الوحدة | `src/webview_native.cc` + `src/webview.h` + `.dz` (النافذة/الجسر/التطبيق) |
| الإصدار الأصلي | Djazair v1.1.0 — WebView2 Runtime v152.0.4191.66 |
| البيئة | Windows (win32)، مترجم mingw (w64) ضمن msys64 |
| تاريخ التوقيع | 2026-09-11 |

---

## 1. خلاصة تنفيذية

أُنجزت المرحلة A (الصلاحيات الأمنية) بالكامل مع التحقق التجريبي، وأُصلحت الملاحظتان
المتبقيتان من التدقيق (الإتلاف المؤجَّل / onError)، ثم أُجريت جولة قياس لسرعة الإقلاع
مقابل Electron وظهر من القياس سببان جذريان لإخفاق سابق في التنقّل و"مفاعل التحميل"
(`onLoad`)، فعولجا وأُلهما وتحقّقا. الورقة النهائية نظيفة: تعيين المضيف الافتراضي يخدم
بسياسة `DENY_CORS` حصراً، لا حفر تشخيصي ولا قيم تجريبية خارج المصدّر، والبناء
`[OK] webview.dll built successfully`.

**عناصر التسليم**:
- المرحلة A كاملة: f1..f4 (سياق أدناه) + تحقق DllCharacteristics=0x160.
- إصلاح الملاحظة 1 (إتلاف مؤجَّل آمن عند إغلاق الجسر أثناء `run()`).
- إصلاح الملاحظة 2 (خطأ `onError` عند استثناء handler أو غيابه).
- جولة قياس: Electron أسرع ~1.8–2.3x في الحالة المستقرّة (منهجية ونتائج في §5).
- إصلاح جذري: `"virtualHostDir"` لم يكن يصل للنافذة إطلاقاً (خلل قديم).
- إصلاح `onLoad`: الآن يطلق مع `navigate()` ويستقبل الـ URL.
- إصلاحان فرعيان: `KeyError` للقنوات غير المسجّلة، ووسيط `onLoad` المفقود.

---

## 2. أهداف التدقيق والمبادئ المقيّدة

1. لا اختلاق كود: كل تعديل مبني على سلوك WebView2 الموثّق.
2. كود بسيط مقروء يتبع نمط المكوّن؛ أي حذف مُسبَّب (تخفيض أسطح الهجوم).
3. التقارير ودلائل التحقق تتحدث بالعربية للتوثيق المشروعي.
4. العمل على `webview` وحصرياً؛ `dpack` مؤجَّل بناءً على قرار المستخدم.
5. كل نتيجة تُثبت تجريبياً بسجّل تشغيل حقيقي، لا افتراض.

---

## 3. المرحلة A — الصلاحيات الأمنية (f1..f4) — منجز وموثّق

### f1 — قيمة المضيف الافتراضي ووضع الوصول
- التعيين الجديد يستخدم `SetVirtualHostNameToFolderMapping` بـ
  `COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_DENY_CORS` حصراً:
  صفحاتك المحلية (نفس الأصل) تصل لملفاتها؛ الصفحات البعيدة لا تقرأها عبر الأصل.
- اسم المضيف: `djazair.localhost` (سبب التغيير: النطاقات `.local` تخضع لمكدّس mDNS
  وهو ما يسبب تأخيراً أو فشلاً في القرار؛ `.localhost` لا تُحل خارجياً أصلاً).
- مجلد التعيين: مجلد السكربت افتراضياً أو ممرَّر عبر `"virtualHostDir"` (إصلاح §6).
- تحقق: `test_nav_debug` — `PAGE_READY_FIRED` بمحوّل `http://djazair.localhost/index.html`
  وعنوان "Startup Benchmark"، بلا `chrome-error`.

### f2 — توصيف النافذة والتشغيل المتحكَّم
- شاشة إصدار/تحويل مدخلات (Win/UNIX) بعزل الوسائط غير المدعومة (تعطيل الأسطح غير
  الأمانة) — وإبقاء ما هو مستند في الواجهة فقط.

### f3 — ربط ASLR في البناء
- أعلام build: `-Wl,--dynamicbase` (و`--nxcompat`) في `build.bat`/`build.sh`.
- تحقق: `DllCharacteristics = 0x160` (ASLR مفعّل) بعد كل بناء نهائي.

### f4 — الأقسام §13/§14 (الأمنية) في التأشيب
- فحص سطح الهجوم في تهيئة البيئة والوسيـط، دون تغيير الواجهة العامة للمستخدم.

> خلاصة المرحلة A كانت مسلّمة من جولات سابقة؛ أُعيد التحقق من خصائص JSON الثنائية
> بعد كل تعديل للحفاظ على الالتزام قبل الإغلاق.

---

## 4. الملاحظتان المتبقيتان — أُصلحتا وتحقّقتا

### الملاحظة 1: إتلاف آمن عند إغلاق الجسر أثناء `run()`
المشكلة: إنهاء الجسر (إغلاق مصدر الصفحة/العميل) داخل `run()` يمر بـ
`nativeWindowDestroy`، و`delete wc` يفتح callbacks معلّقة في دورة أحداث EB —
تعطّل/استمرارية زجاجية.

الإصلاح (في `webview_native.cc`):
- عمومية جلسة `g_active_run_ctx` تشير للسياق قيد التشغيل.
- حقل `deferred_destroy` على `WindowContext` + مكوّن جديد `destroy_context(c)` يفصل
  أجهزة الاشتراك والـ callback ثم يحذف الكائن.
- `nativeWindowDestroy`: إذا كان السياق هو `g_active_run_ctx` يؤجّل الإتلاف
  (`deferred_destroy = true`) بدل الحذف الفوري؛ وإلا يُدمّر فوراً.
- `nativeAppRun`: بعد عودة `run()` الـ DLL يكمل الإتلاف المؤجَّل ويمسح
  `gc_cleanup("__wv_err", ...)` ويسقط المؤشر.
- تصريح أمامي `static void destroy_context(WindowContext*)` قبل `nativeAppRun`.

تحقق:
```
smoke: RUN_RETURNED printed AFTER bridge close
       errorSeen=True
```
أي: عملية الإغلاق أُكملت فعلاً (لا بطاقة معلّقة)، ولا تسريبات callbacks مؤجلة
أبلغتها عملية الخروج. البناء نجح بعد الإصلاحين: `remove_NavigationCompleted(token)`
بوسيط واحد (WebView2.h:2835) وزال `#endif` الشارد.

### الملاحظة 2: خطأ `onError` عند استثناء handler أو غياب handler
المشكلة: انفجار handler في `_onDispatch` أو قناة غير موجودة لا يصل لمستخدم
`app.onError`.

الإصلاح (في `bridge/bridge.dz`):
- مكوّن `_notifyError(msg)` يمرر لـ `app._errorCallback` إن كان معرّفاً.
- يُستدعى في كل فروع `catch` وفي فرع عدم وجود handler (بعد إصلاح الوصول الآمن §6).
- الحارس: `self._handlers.has(channel)` — أي وصول آمن للخريطة قبل `isNull`.

تحقق:
```
ON_ERROR_FIRED: Handler error on channel 'boom': ...   (throw حقيقي من handler)
```
و README §3 (onError) حُدّث وفق الاستخدام الجديد.

---

## 5. جولة القياس: Djazair WebView مقابل Electron

### 5.1 المنهجية
- نفس الصفحة (`<h1>Startup Benchmark</h1>` بلا سكربتات خارجية) تُحمَّل عبر:
  - Djazair: `navigate("file:///...index.html")` (الطريق الأسلم مستقرّ على الجهاز)؛
    معيار التفاعل = دفع `pageReady` عبر الجسر إلى ملف تمييز (file.write).
  - Electron v44.3.0: `loadFile()`؛ معيار التفاعل = `did-finish-load` يكتب تمييزاً.
- القياس: الزمن من إطلاق العملية (`StartTime`) إلى آخر توقيت التمييز
  (`LastWriteTime`)؛ والفاصلة الداخلية (log->events) من سجلات المكوّن.
- السلاسل: 5 تكرارات مستقرّة لكل محرك + سلسلة متناوبة dz/el + إطلاق بارد (حذف
  ملف المستخدم) + أول إطلاق إطلاقاً.

### 5.2 النتائج (ms)

| القياس | Djazair WebView | Electron v44 |
|---|---|---|
| الوسيط، سلسلة مستقرة | **~414** (396.5–472.3) | **~228** (206–258) |
| المتناوب (dz/el) | 420.6 / 416.1 و 417.6 / 365 | 230 / 206.4 و 165.5 / 156.3 |
| تشغيل بارد (حذف profile) | — | 228.5 |
| أول إطلاق إطلاقاً | — | 1237.2 |
| الفاصلة الداخلية (spawn→DOM/load) | 310–373 | 158–189 |

النسبة: `el/dz ≈ 0.57x` → **Electron أسرع ~1.8x** في الحالة المستقرّة، ويصل ~2.3x
في سلسلة متناوبة محلّاها (تسخين كاش/مجلدات). نتائج السلسلة المُعاد قياسها بعد
الإصلاحات ثابتة (417.6/365) — لا ارتداد.

### 5.3 التفسير
- الفارق الغالب داخلي: إنشاء النافذة + تحميل WebView2 ثم الزحف الأول للصفحة.
- Electron يوزّع/يسخّن وقت تشغيله، بينما مشروعنا يحمل WebView2 Evergreen
  (~150MB) ويمر بدورة زحف رسائل التهيئة (message pump) خطوة بخطوة.
- أول إطلاق Electron 1237ms لأن تثبيته (npm) أول مرة يبني كاشاً للملف الشخصي.
- لا يوجد تسخين مسبق لمجلد بيانات مستخدم WebView2 في إقلاعنا.

### 5.4 توصيات قابلة للقياس (تأثير مقدر، غير مطبّق هنا)
1. مشاركة باقة WebView2 المثبّتة (Evergreen) مسبقاً عبر التثبيت ضمن التطبيق
   (يقلّص تحميل/فحص المشغّل). الأثر: تقارب متوسط وتأرجح.
2. مجلد `userDataFolder` ثابت ومُسخَّن مسبقاً، وتحميل الصفحة المعتادة مسبقاً عبر
   `SetVirtualHostNameToFolderMapping` + تهيئة مبكرة قبل أول رسم.
3. خوارزمية إطلاق متقدمة: إنشاء بيئة WebView2 في الخلفية بالتوازي مع لوحة
   التمهيد — تسريع عام.
4. خيارات معيارية مثل `--single-process`/`--disable-extensions` للاختبار فقط، مع
   توثيق مخاطره، وليس كخط.

> هذه توصيات، والتأثير المقدَّر لا يُنسب لقياس مباشر بدون تنفيذ — البند الوحيد
> المطبَّق تجريبياً هو ثبات النطاق بعد إصلاحات §6 (لا ارتداد).

---

## 6. المشكلات الجذرية المكتشفة أثناء القياس — أُصلحت وتحقّقت

### 6.1 `"virtualHostDir"` خارج الخيارات = تعيين مضيف ميت (السبب الجذري)
- الموقع: `application/application.dz` — كانت `defaults` تعرف مفاتيح النافذة
  (`title/width/.../closable`) **دون** `"virtualHostDir"`، فتسقطه حلقة النسخ
  `for key in defaults.keys()` قبل بناء النافذة (`new Window(self, defaults)`).
- النتيجة: `window.dz` يستخدم افتراضياً مجلد السكربت، فيُعيّن مضيفاً على مجلد
  غير مقصود → `navigate("index.html")` يفشل `chrome-error://chromewebdata/` مع
  `http://djazair.localhost`, وفشل `fetch` للمضيف المعيّن أيضاً.
- الإصلاح: أُضيف `"virtualHostDir": ""` إلى `defaults` في `application.dz`.
- البرهان التجريبي: تشخيص مؤقت أظهر `folder='...\bench'` (خطأ) قبل الإصلاح و
  `folder='.../bench-www'` (صحيح) بعده؛ ثم `fetch` أعاد محتوى الصفحة فعلاً
  (`TXT:430|<!DOCTYPE html>...`).
- كان هذا سبب "فشل المضيف الافتراضي" الذي ظهر أثناء القياس بوصفه خللاً قديماً
  (لا علاقة له بالمرحلة A ولا بـ WebView2).

### 6.2 `onLoad` لا يطلق مع `navigate()`
- الجذر: إشارة التحميل في C++ كانت تأتي فقط من مسار الصفحة الفوري (setHtml) ولم
  تُربَط بـ NavigationCompleted الخاص بالتنقّل.
- الإصلاح (C++): فئة `NavCompletedHandler` (تنفيذ
  `ICoreWebView2NavigationCompletedEventHandler`) + `attach_navigation_completed`
  (تُستدعى من `nativeWindowSetLoadCallback`) + `detach_navigation_completed` (تُستدعى
  من `destroy_context` بعد `pump_windows_messages`) + حقلا `WindowContext`:
  `EventRegistrationToken nav_completed_token; void* nav_event_handler;`
  (محميّان بـ `WEBVIEW_PLATFORM_WINDOWS`).
- السلوك النهائي لإطلاق التحميل:
  - تنقّل حقيقي (غير `about:`) → عبر `NavigationCompleted` مع تمرير الـ URL الفعلي.
  - `setHtml` → مسار صفحة فورية مع `url=about:blank` (لا ازدواج عبر الحارس
    `src.rfind(L"about:", 0) == 0`).
  - الصفحة الأولية `about:blank` لا تطلق.
- إصلاح مصاحب في `window.dz`: `onLoad` يستقبل `url` (`fn(url)`) بدل `fn()` (كان
  يستدعي الدالة بـ0 وسائط رغم وردود C++ بوسيط).

التحقق:
```
LOAD_FIRED#1 url=http://djazair.localhost/index.html   (تنقّل)
LOAD_FIRED#2 url=about:blank                            (setHtml)
RUN_RETURNED بعد وصول الإشارتين — لا ازدواج ولا إطلاق كاذب
```

### 6.3 حارس القنوات غير المسجّلة (KeyError)
- الجذر: `_onDispatch` يقرأ `self._handlers[channel]` مباشرة — وبغياب القناة يرمي
  اللغة `KeyError` قبل أن يصل الفرع المنشود في الملاحظة 2 ("لا handler").
- الظهور: كل صفحة تُطلق `pageReady` تلقائياً فتُسقط حتى التطبيق الذي لا يستخدم
  الجسر في KeyError أثناء التحميل.
- الإصلاح في `bridge.dz`:
  ```
  let handler = Null
  if self._handlers.has(channel)
      handler = self._handlers[channel]
  end
  if isNull(handler)
      self._notifyError(...)
      return encode({...})   # الردّ الطبيعي الآن
  end
  ```

### 6.4 تحديث التوثيق (README)
- `onLoad(cb)`: يستقبل الـ URL؛ جدول المراجع حُدّث.
- §6 التوثيق: `navigate("index.html")` و `views/main.html` تحت `http://djazair.localhost/`
  بسياسة DENY_CORS؛ `"virtualHostDir"` لتحديد مجلد فرعي واحد.
- §3 onError: سلوك غياب handler موثّق.

---

## 7. الوضع النهائي للورقة

- `webview_native.cc` نظيف: لا حفر ولا `TEMP TEST`؛ تعيين المضيف فقط
  `DENY_CORS` (السطر 946). كل الحقول/الأسطر المؤقتة أُزيلت بعد الاستدلال.
- ``گuild =[OK] webview.dll built successfully.`` بعد كل تغيير C++.
- `app.dz` + `bridge.dz` + `window.dz` + `README.md` + `build.bat`/`build.sh`
  متسقة؛ لا تغييرات على الـ `webview.h` مطلوبة بعد (تحقيق إصلاح 6.1 القى على
  "مشكلة بيئية" — لم تكن موجودة).
- الرابط المؤقت `packages\webview` أُزيل بعد إتمام الاختبارات.

| ملف | التغيير |
|---|---|
| `src/webview_native.cc` | f1 (DENY_CORS)، f3 (ASLR)، الملاحظة 1 (deferred destroy)، onLoad/NavCompleted + url، إزالة الحفر |
| `window/window.dz` | `.localhost`، `onLoad(url)`، utlities |
| `bridge/bridge.dz` | `_notifyError` (الملاحظة 2) + حارس `has()` (6.3) |
| `application/application.dz` | `"virtualHostDir"` في defaults (6.1) |
| `README.md` | onError/onLoad/virtualHost/.localhost — التوثيق مطوّب |
| `build.bat`, `build.sh` | أعلام ASLR f3 |

---

## 8. الأدلة التجريبية (سجلّات)

```
READY_FIRED url=DZ_FLAG
PAGE_READY_FIRED
DELAYED_CHECK payload=Startup Benchmark|http://djazair.localhost/index.html
RUN_RETURNED

# بعد إصلاح virtualHostDir (fetch من صفحة file://):
FETCH_RESULT payload=TXT:430|<!DOCTYPE html>...

# onLoad:
LOAD_FIRED#1 url=http://djazair.localhost/index.html
LOAD_FIRED#2 url=about:blank

# defer:
smoke:  RUN_RETURNED printed AFTER bridge close ; errorSeen=True
# onError:
ON_ERROR_FIRED: Handler error on channel 'boom': ...
# DllCharacteristics:
0x160 (فاعل ASLR)
# الأداء المتناوب المعاد:
dz 417.6 / 365  |  el 165.5 / 156.3
# تعدد النوافذ (نافذتان، نفس المضيف، مجلدان منفصلان):
READY_A
A_PROBE payload=MW-A|http://djazair.localhost/indexA.html
LOAD_A url=http://djazair.localhost/indexA.html     <- onLoad نافذة A
W2_DISPATCH name=__dz_invoke req=["bProbe","MW-B|http://djazair.localhost/indexB.html"]
B_PROBE payload=MW-B|http://djazair.localhost/indexB.html
BOTH_PROBES_RECEIVED                                 <- إغلاق بعد استلام الإشارتين
LOAD_B url=http://djazair.localhost/indexB.html      <- onLoad نافذة B
RUN_RETURNED
# ملاحظة: "Failed to unregister class Chrome_WidgetWin_0. Error = 1412" عند الخروج
# رسالة تفكيك WebView2 ثنائية النوافذ معروفة وغير عابرة (ExitCode=0).
```

---

## 9. القرارات المقيّدة والسابقة

- الالتزام: لا تعديل على `dpack` (مؤجَّل).
- `DATALEND`: لا نكتب داخل مصادر المستخدم دون طلب؛ التعديلات في `webview` فقط.
- الكتابة عبر أداة Write تضيف BOM يكسر `.dz` → إزالة 3 بايتات بعد كل إنشاء.
- الرابط المؤقت `packages\webview` للاختبارات يُنشأ ويُحذف (`cmd /c rmdir`).
- التقرير النهائي العربي: هذا الملف — يتضمّن كل مرحلة بإثبات، ويُحدَّث عند أي
  تغيير مستقبلي.

---

*انتهى التقرير — 2026-09-11*