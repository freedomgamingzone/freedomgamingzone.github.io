# 🚀 Deploy nhanh 5 phút (100% FREE)

## Chọn 1 trong 3 cách:

### ⭐ **Cách 1: Render.com** (Dễ nhất - Recommend)

**Ưu điểm**: Đơn giản, stable, free vĩnh viễn  
**Nhược điểm**: Sleep sau 15 phút (dùng UptimeRobot fix)

```bash
1. https://render.com → Sign up với GitHub
2. New Web Service → Connect repo này
3. Cài đặt:
   - Build: npm install
   - Start: node server-secure.js
   - Instance: FREE
4. Copy URL: ai-human-game.onrender.com
5. Update index.html dòng 726:
   const WS_SERVER = 'wss://ai-human-game.onrender.com';
6. Push GitHub → Enable Pages
```

**Fix sleep**: https://uptimerobot.com → Add monitor ping mỗi 5 phút

---

### 🔥 **Cách 2: Fly.io** (Không sleep)

**Ưu điểm**: Không bao giờ sleep, free 3 VMs, stable  
**Nhược điểm**: Phức tạp hơn (cần CLI)

```bash
# Cài Fly CLI (Windows PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Deploy
fly auth login
fly launch --name ai-human-game --region sin
fly deploy

# Lấy URL
fly status
# → Copy URL: ai-human-game.fly.dev
```

Update `index.html`:
```javascript
const WS_SERVER = 'wss://ai-human-game.fly.dev';
```

---

### 🎨 **Cách 3: Glitch.com** (Test/Demo)

**Ưu điểm**: Edit code trực tiếp trên web, không cần Git  
**Nhược điểm**: Sleep sau 5 phút

```bash
1. https://glitch.com → Sign up
2. New Project → Import from GitHub
3. Paste URL repo này
4. Glitch tự động deploy
5. Copy URL: your-project.glitch.me
```

**Lưu ý**: Glitch chỉ phù hợp test, không nên dùng production

---

## 📱 So sánh nhanh

| Dịch vụ | FREE | Sleep | Độ khó | Recommend |
|---------|------|-------|--------|-----------|
| **Render.com** | ✅ Vĩnh viễn | Có (fix được) | ⭐ Dễ | ⭐⭐⭐⭐⭐ Production |
| **Fly.io** | ✅ 3 VMs | Không | ⭐⭐ TB | ⭐⭐⭐⭐ Advanced |
| **Glitch** | ✅ Vĩnh viễn | Có (5 phút) | ⭐ Rất dễ | ⭐⭐⭐ Test only |
| **Railway** | ❌ Từ $5 | Không | ⭐ Dễ | ❌ Tốn tiền |

---

## ✅ Checklist

- [ ] Deploy backend lên Render/Fly.io/Glitch
- [ ] Copy URL backend
- [ ] Update `index.html` dòng 726 với URL thật
- [ ] (Optional) Setup UptimeRobot nếu dùng Render
- [ ] Push code lên GitHub
- [ ] Enable GitHub Pages (Settings → Pages)
- [ ] Test: Mở https://freedomgamingzone.github.io/

---

## 🆘 Lỗi thường gặp

**"WebSocket connection failed"**
→ Kiểm tra URL backend có đúng không, có `wss://` chưa

**"Server sleep quá lâu"**
→ Setup UptimeRobot hoặc chuyển sang Fly.io

**"Port 3000 not found" trên Render**
→ Đã fix trong code, dùng `process.env.PORT`

**"GitHub Pages not working"**
→ Đợi 2-3 phút, clear cache browser (Ctrl+Shift+R)

---

## 💡 Tips

1. **Dùng Render + UptimeRobot** = Giải pháp tốt nhất cho người mới
2. **Fly.io** nếu bạn biết dùng CLI và muốn server không sleep
3. **Glitch** chỉ để demo cho bạn bè xem, không dùng thật

**Chi phí cuối cùng: $0** 🎉
