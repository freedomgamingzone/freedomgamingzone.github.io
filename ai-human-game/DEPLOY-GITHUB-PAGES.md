# 🚀 Deploy lên GitHub Pages + Render.com (100% FREE)

## Tổng quan

**GitHub Pages** = Host frontend (index.html) - MIỄN PHÍ VĨNH VIỄN  
**Render.com** = Host backend (server.js) - MIỄN PHÍ (có sleep 15 phút)

⚠️ **Lưu ý**: Railway KHÔNG còn free tier. Dùng Render.com hoặc Fly.io thay thế.

---

## 📦 Bước 1: Deploy Backend lên Render.com (FREE)

### 1.1 Đăng ký Render.com

1. Truy cập: https://render.com
2. Sign Up với GitHub account
3. Authorize Render to access GitHub

### 1.2 Deploy WebSocket Server

1. **Dashboard** → Click **"New +"** → Chọn **"Web Service"**

2. **Connect Repository**:
   - Nếu chưa connect GitHub: Click "Connect GitHub"
   - Chọn repo của bạn (hoặc click "Configure account" để thêm repo)

3. **Configure Service**:
   ```
   Name: ai-human-game (hoặc tên bất kỳ)
   Region: Singapore (gần Việt Nam nhất)
   Branch: main
   Root Directory: (để trống)
   Runtime: Node
   Build Command: npm install
   Start Command: node server-secure.js
   ```

4. **Free Plan**:
   - Instance Type: **Free** (chọn option này)
   - ⚠️ **Lưu ý**: Free tier sẽ sleep sau 15 phút không có request
   - Wake-up mất ~30 giây khi có người truy cập lại

5. **Environment Variables** (không cần thiết lập, để mặc định)

6. Click **"Create Web Service"**

7. **Đợi deploy** (~2-3 phút):
   - Xem logs để kiểm tra
   - Khi thấy "✅ Live" → Deploy thành công!

8. **Lấy URL**:
   - Copy URL ở đầu page (ví dụ: `ai-human-game.onrender.com`)
   - Đây là URL backend của bạn

### 1.3 Giải quyết vấn đề Sleep (Optional)

**Vấn đề**: Free tier sleep sau 15 phút không dùng

**Giải pháp 1: UptimeRobot** (Recommend - FREE)
1. Đăng ký: https://uptimerobot.com (free account)
2. Add New Monitor:
   - Monitor Type: HTTP(s)
   - Friendly Name: AI Human Game
   - URL: `https://ai-human-game.onrender.com/`
   - Monitoring Interval: **5 minutes**
3. Save → Server sẽ không bao giờ sleep!

**Giải pháp 2: Cron-job.org** (Alternative)
1. Đăng ký: https://cron-job.org
2. Tạo cronjob ping server mỗi 5 phút

**Giải pháp 3: Chấp nhận sleep** (Không làm gì)
- Người dùng đầu tiên đợi 30s wake-up
- Những người sau vào ngay lập tức

---

## 🌐 Bước 2: Update WebSocket URL trong index.html

Mở `index.html`, tìm dòng:
```javascript
const WS_SERVER = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:3000'                                    
    : 'wss://YOUR-BACKEND-SERVER.railway.app';
```

**Thay `YOUR-BACKEND-SERVER.railway.app` bằng domain Render của bạn.**

Ví dụ:
```javascript
const WS_SERVER = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:3000'                                    
    : 'wss://ai-human-game.onrender.com';  // ✅ Thay domain Render thật của bạn
```

**Lưu ý**: 
- Render tự động cung cấp SSL → dùng `wss://` (secure WebSocket)
- Không cần port `:3000` vì Render tự động route

---

## 📤 Bước 3: Deploy Frontend lên GitHub Pages

### 3.1 Tạo repo GitHub

**Option A: User/Organization Pages** (URL đẹp hơn)
```bash
# Tên repo PHẢI là: username.github.io
# Ví dụ: freedomgamingzone.github.io
```

**Option B: Project Pages** (URL có thêm /project-name)
```bash
# Tên repo bất kỳ
# Ví dụ: ai-human-game
# URL sẽ là: freedomgamingzone.github.io/ai-human-game
```

### 3.2 Push code lên GitHub

```bash
# Trong folder ai-human-game
git init
git add index.html
git commit -m "Deploy to GitHub Pages"
git branch -M main
git remote add origin https://github.com/freedomgamingzone/freedomgamingzone.github.io.git
git push -u origin main
```

### 3.3 Enable GitHub Pages

1. Vào repo → **Settings**
2. Sidebar: **Pages**
3. **Source**: Deploy from a branch
4. **Branch**: main / (root)
5. **Save**
6. Đợi 1-2 phút → Truy cập `https://freedomgamingzone.github.io/`

---

## ✅ Kiểm tra hoạt động

1. **Frontend**: https://freedomgamingzone.github.io/
2. **Backend**: https://your-app.railway.app/
3. Mở trình duyệt → F12 Console → kiểm tra kết nối WebSocket
4. Nếu thấy "WebSocket connected" → Thành công! ✅

---

## 🔧 Troubleshooting

### Lỗi: "WebSocket connection failed"

**Nguyên nhân**: Backend server không chạy hoặc URL sai

**Giải pháp**:
1. Kiểm tra Render logs: Dashboard → Service → Logs tab
2. Xem service có status "Live" (màu xanh) không
3. Kiểm tra Render URL có đúng không (copy chính xác)
4. Test backend trực tiếp: Mở `https://your-app.onrender.com/` trên browser
5. Xem console trình duyệt (F12) để xem lỗi chi tiết

### Service đang sleep (Free tier)

**Hiện tượng**: Lần đầu vào chờ lâu, sau đó OK

**Nguyên nhân**: Render free tier sleep sau 15 phút không dùng

**Giải pháp**:
- Setup UptimeRobot ping mỗi 5 phút (xem bước 1.3) HOẶC
- Chấp nhận chờ 30s lần đầu HOẶC
- Upgrade Render plan ($7/tháng) HOẶC
- Dùng Fly.io (không sleep nhưng setup phức tạp hơn)

### Mixed Content Error (HTTP/HTTPS)

**Vấn đề**: GitHub Pages dùng HTTPS nhưng backend dùng HTTP

**Giải pháp**: Render tự động có SSL (wss://), không cần lo

### Port 3000 not found trên Render

**Vấn đề**: Server dùng cố định port 3000 thay vì `process.env.PORT`

**Giải pháp**: Đã fix trong `server.js` và `server-secure.js` dùng `process.env.PORT`

---

## 💰 Chi phí

| Service | Miễn phí | Giới hạn | Cost sau free tier |
|---------|----------|----------|-------------------|
| **GitHub Pages** | ✅ Vĩnh viễn | Bandwidth 100GB/tháng | Miễn phí mãi mãi |
| **Render.com** | ✅ Vĩnh viễn | Sleep sau 15 phút không dùng | $7/tháng no sleep |
| **Fly.io** | ✅ 3 VMs | 160GB bandwidth/tháng | $1.94/VM/tháng |
| **Glitch.com** | ✅ Vĩnh viễn | Sleep sau 5 phút | $8/tháng boosted |
| **UptimeRobot** | ✅ 50 monitors | Check mỗi 5 phút | $7/tháng nếu cần nhiều hơn |

**Recommendation**: 
- **Render + UptimeRobot** = 100% FREE, stable, đủ cho 1000+ users
- **Fly.io** = FREE nhưng phức tạp hơn, không sleep
- **Railway** = ❌ Không còn free (từ $5/tháng)

---

## 🚀 Alternative: Deploy lên Fly.io (FREE, không sleep)

Nếu bạn muốn server **KHÔNG BAO GIỜ SLEEP** và vẫn FREE:

### Bước deploy Fly.io:

1. **Cài Fly CLI**: https://fly.io/docs/hands-on/install-flyctl/
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**:
   ```bash
   fly auth login
   ```

3. **Tạo file `fly.toml`** (tôi tạo sẵn cho bạn rồi):
   ```toml
   app = "ai-human-game"
   
   [build]
     builder = "heroku/buildpacks:20"
   
   [[services]]
     internal_port = 3000
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = 80
     
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

4. **Deploy**:
   ```bash
   fly launch
   fly deploy
   ```

5. **Lấy URL**: `https://ai-human-game.fly.dev`

**Ưu điểm Fly.io**: KHÔNG sleep, stable, free 3 VMs  
**Nhược điểm**: Phức tạp hơn Render

---

## 🎯 Tóm tắt nhanh (Render.com)

```bash
# 1. Deploy backend lên Render
- Đăng nhập Render.com
- New Web Service → Connect GitHub repo
- Build: npm install
- Start: node server-secure.js
- Copy URL (ví dụ: ai-human-game.onrender.com)

# 2. Setup UptimeRobot (để không sleep)
- Đăng ký UptimeRobot.com
- Add Monitor → HTTP(s)
- URL: https://ai-human-game.onrender.com
- Interval: 5 minutes

# 3. Update index.html
const WS_SERVER = 'wss://ai-human-game.onrender.com';

# 4. Push lên GitHub
git push origin main

# 5. Enable GitHub Pages
Settings → Pages → Deploy from main branch

# 6. Truy cập
https://freedomgamingzone.github.io/
```

**🎉 Done! 100% FREE, không giới hạn thời gian!**
