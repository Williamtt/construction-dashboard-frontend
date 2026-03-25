# Construction Dashboard 交付說明書（Railway 後端 + Vercel 前端）

本文說明接收方如何將以下 **GitHub `prod` 分支** 部署到 **Railway（後端 + PostgreSQL）** 與 **Vercel（前端）**，並完成資料庫初始化與 Prisma migration。

| 專案 | GitHub（`prod` 分支） |
|------|------------------------|
| 前端 | [construction-dashboard-frontend](https://github.com/henrya860919/construction-dashboard-frontend/tree/prod) |
| 後端 | [construction-dashboard-backend](https://github.com/henrya860919/construction-dashboard-backend/tree/prod) |

---

## 一、你需要準備的帳號與工具

1. **GitHub**：可存取或 fork 上述兩個 repo（部署時需授權 Railway / Vercel 讀取 repo）。
2. **Railway**：[railway.app](https://railway.app) 帳號（後端 API + PostgreSQL）。
3. **Vercel**：[vercel.com](https://vercel.com) 帳號（前端靜態／SPA）。
4. **本機環境**（建議）：
   - **Node.js** 20 LTS（或 22）
   - **Git**
   - **Railway CLI**（用於初始化資料庫、本機帶入雲端環境變數執行 migration）

### 安裝 Railway CLI

```bash
# 擇一即可
npm i -g @railway/cli

# 或使用 Homebrew（macOS）
brew install railway
```

登入：

```bash
railway login
```

---

## 二、建議整體順序（一次跑通）

1. 在 **Railway** 建立專案，部署**後端** repo 的 **`prod`** 分支。
2. 在同一 Railway 專案中**新增 PostgreSQL**，並讓後端服務能讀到 **`DATABASE_URL`**（見第三節）。
3. 設定後端**其餘環境變數**（JWT、CORS 等），完成建置與啟動；執行 **Prisma migration**（見第四節）。
4. 記下後端**公開 HTTPS 網址**（例如 `https://xxx.up.railway.app`）。
5. 在 **Vercel** 部署**前端** repo 的 **`prod`** 分支，設定 **`VITE_API_URL`** 為上述後端網址（**不要**結尾 `/`）。
6. 回到 Railway 後端，將 **`CORS_ORIGIN`** 設為 Vercel 前端網址（可多個，逗號分隔），重新部署或重啟服務。

---

## 三、Railway：後端與 PostgreSQL

### 3.1 用網頁後台部署後端（最常見）

1. Railway Dashboard：**New Project** → **Deploy from GitHub repo**。
2. 選擇 **construction-dashboard-backend**，分支選 **`prod`**。
3. Railway 會偵測 Node 專案；確認大致等同：
   - **Build**：`npm install`（postinstall 會執行 `prisma generate`）+ `npm run build`
   - **Start**：`npm start`（即 `node dist/index.js`）

若平台未自動帶入，請在服務設定中手動指定。

### 3.2 用 Railway CLI 初始化／連結專案

依你的情境擇一：

| 情境 | 指令（在後端 repo 根目錄執行） |
|------|--------------------------------|
| **新建一個空的 Railway 專案並連到本目錄** | `railway init`（或 `railway init --name 你的專案名`） |
| **本目錄要連到「已存在」的 Railway 專案** | `railway link` |

之後可用 `railway status` 或 Dashboard 確認目前連結的 **Project / Environment / Service**。

### 3.3 用 Railway CLI 建立（初始化）PostgreSQL 資料庫服務

在**已連結到該 Railway 專案**的目錄下（通常為後端專案根目錄）：

```bash
# 新增 PostgreSQL（官方文件：非互動可加旗標）
railway add --database postgres
```

或使用互動選單：

```bash
railway add
```

依提示選擇 **PostgreSQL**。建立後 Railway 會部署資料庫服務；Postgres 服務上會有 **`DATABASE_URL`** 等連線變數。

### 3.4 讓「後端服務」取得 `DATABASE_URL`

僅建立 Postgres **不會**自動讓你的 API 服務帶到變數，需在 **後端（Node）那個 Service** 設定：

1. 開啟 Railway → 你的 **後端 Web Service** → **Variables**。
2. 新增 **`DATABASE_URL`**，使用 **Reference** 指向 **PostgreSQL** 服務的 `DATABASE_URL`（UI 上通常可選「變數引用」）。

（若你暫時從 Postgres 服務複製連線字串貼到後端，亦可運作，但維護上建議用 Reference。）

### 3.5 後端必填／建議環境變數（Railway）

請在**後端 Service** 的 Variables 設定（勿 commit 進 Git）：

| 變數 | 說明 |
|------|------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | 由 PostgreSQL 服務引用（上一小節） |
| `JWT_SECRET` | 強隨機字串，例如本機執行：`openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | 建議同樣強隨機；若程式有使用 refresh |
| `CORS_ORIGIN` | 前端正式網址，**多個逗號分隔**。例：`https://你的專案.vercel.app` |
| `PORT` | 多數平台會注入；若未注入可設 `3003` 或依 Railway 文件使用 `$PORT`（若你程式讀 `PORT`） |

**檔案儲存**（上傳檔案功能）：

- 開發常用 `FILE_STORAGE_TYPE=local`；**正式環境建議** `FILE_STORAGE_TYPE=r2` 並依後端 `.env.example` 填寫 `R2_*`（Cloudflare R2）。

其他選填變數（如 `JSON_BODY_LIMIT`、串流相關）見後端 repo 的 **`.env.example`**。

---

## 四、資料庫 Schema：Prisma Migration

後端使用 Prisma；**第一次上線與之後每次 schema 有變更**，都需對正式 DB 執行：

```bash
npx prisma migrate deploy
```

（專案內 npm script：`npm run db:migrate`）

### 4.1 推薦：用 Railway CLI 在本機對「雲端 DB」跑 migration

1. 本機 clone **後端** repo，`cd` 到根目錄，`npm install`。
2. 確認已 `railway link`，且目前連結的 **Service** 是**後端**（能拿到含 `DATABASE_URL` 的環境）。
3. 執行：

```bash
railway run npx prisma migrate deploy
```

若一個專案內有多個 service，需指定後端服務名稱：

```bash
railway run --service 你的後端服務名 npx prisma migrate deploy
```

此方式會把 Railway 上該服務的環境變數注入本機行程，**不會**把 `DATABASE_URL` 寫進你的 `.env` 檔。

### 4.2 替代：每次部署時自動 migrate

也可將**啟動指令**改為先 migrate 再啟動（需自行在 Railway 後台設定 Start Command），例如：

```bash
npx prisma migrate deploy && npm start
```

請與團隊約定一種方式，避免重複執行或漏執行。

### 4.3（選用）種子資料

本機在能連到該資料庫的前提下可執行 seed（**正式環境請謹慎**，僅在允許的環境使用）：

```bash
railway run npm run db:seed
```

測試帳號與密碼規則見後端 README／seed 腳本說明。

---

## 五、Vercel：前端

1. Vercel Dashboard：**Add New…** → **Project** → Import **construction-dashboard-frontend**。
2. **Production Branch** 設為 **`prod`**（與你給的連結一致）。
3. Framework Preset：**Vite**（若自動偵測即可）。
4. Build 設定通常為：
   - **Build Command**：`npm run build`
   - **Output Directory**：`dist`
5. **Environment Variables**（Production）新增：

   | Name | Value 範例 |
   |------|------------|
   | `VITE_API_URL` | `https://你的後端.railway.app`（**無**結尾 `/`） |

6. Deploy。部署完成後，將 Vercel 給你的 **`https://....vercel.app`**（或自訂網域）加入後端 **`CORS_ORIGIN`**，再重啟／重部署後端。

**注意**：`VITE_*` 在 **build 時**嵌入前端；變更 `VITE_API_URL` 後需 **Redeploy**。

`vercel.json` 已設定 SPA fallback，一般不需再改。

---

## 六、上線後驗證清單

| 步驟 | 預期 |
|------|------|
| 瀏覽器開啟 `https://後端網域/health` | 回傳健康狀態（後端有提供 health route） |
| 瀏覽器開啟前端網址 | 可載入登入頁／無 CORS 錯誤（開發者工具 Network） |
| 登入 | 若已 seed，使用測試帳；否則需先建立租戶／使用者（依產品流程） |

若瀏覽器 console 出現 **CORS**，請檢查後端 `CORS_ORIGIN` 是否**完全相符**前端 origin（含 `https`、無多餘路徑）。

---

## 七、本機開發（選讀）

- **後端**：`docker compose up -d`、`cp .env.example .env`、`npm run db:migrate:dev`、`npm run dev`（預設 port **3003**）。詳見後端 README。
- **前端**：`cp .env.example .env`，`VITE_API_URL=http://localhost:3003`，`npm run dev`（預設 port **5175**）。詳見前端 README。

---

## 八、常見問題

**Q：migration 報錯連不到 DB**  
確認後端服務上的 `DATABASE_URL` 正確、Postgres 已 Running，且 `railway run` 指定的是**後端** service。

**Q：前端打 API 404**  
前端 `VITE_API_URL` 應為後端 **origin**，路徑 `/api/v1` 由程式組出；不要誤把 `/api/v1` 加在 `VITE_API_URL` 結尾重複拼接（依目前前端慣例為後端根網址即可）。

**Q：檔案上傳失敗**  
正式環境請設定 **R2**（`FILE_STORAGE_TYPE=r2` 與 `R2_*`）；純 `local` 在 Railway 容器上通常不適合長期保存。

---

## 參考文件（repo 內）

- 後端：`README.md`、`.env.example`、`docs/docker-database.md`
- 前端：`README.md`、`.env.example`
