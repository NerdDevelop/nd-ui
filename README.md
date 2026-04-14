# qb-ui

واجهة بسيطة لعرض **DrawText / Interaction Hint** على الشاشة باستخدام NUI (مفيد للتلميحات مثل: “اضغط E للتفاعل”).

**التطوير:** Nerd Developer — [nerd-developer.com](https://nerd-developer.com)

## الإعداد

- **`config.lua`**: إعدادات النص/الألوان/الموضع (حسب المتوفر داخل السكربت).

## التشغيل

أضف المورد في `server.cfg`:

```
ensure qb-ui
```

## ملفات الواجهة (NUI)

- `html/index.html`
- `html/css/ui.css`
- `html/js/ui.js`

## ملاحظة (Legacy)

الملفات التالية موجودة كـ fallback / توافق قديم (كما هو موضح في `fxmanifest.lua`):

- `html/css/drawtext.css`
- `html/js/drawtext.js`

---

*Developed by Nerd Developer.*
