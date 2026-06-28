# SwagStore - White-box Testing & CI/CD

## Chuc nang bai ca nhan da thuc hien

- Unit testing voi Jest cho model, controller va route tich hop.
- Phan loai tai khoan theo `customer` va `staff`.
- Staff co quyen quan ly san pham: them, xem danh sach, sua, xoa.
- Staff co the tao don hang cho mot khach hang co san.
- GitHub Actions CI/CD: kiem tra cu phap, chay Jest coverage, tao artifact, ho tro deploy Render/Railway bang secret.
- Cau hinh deploy mau: `Procfile`, `render.yaml`, `railway.json`.

## Tai khoan demo

Staff:

- Email: `staff@swagstore.test`
- Password: `Staff@123`

Customer:

- Email: `customer@swagstore.test`
- Password: `Customer@123`

## Chay du an

```bash
npm install
npm start
```

Mo: `http://localhost:3000`

## Chay kiem thu Jest

```bash
npm test
npm run test:coverage
```

Coverage HTML nam trong:

```text
coverage/lcov-report/index.html
```

## GitHub Actions

Workflow chinh nam tai:

```text
.github/workflows/ci.yml
```

Job chinh:

- `lint`: kiem tra cu phap JavaScript bang Node.
- `test`: chay Jest va xuat coverage.
- `build`: kiem tra app khoi dong duoc va tao file `dist/swagstore.zip`.
- `deploy`: chay khi push len `main`; tu deploy neu co `RENDER_DEPLOY_HOOK_URL` hoac `RAILWAY_TOKEN`.

## Deploy

Render:

- Dung `render.yaml`.
- Build command: `npm ci`.
- Start command: `npm start`.
- Neu muon deploy tu dong qua GitHub Actions, them secret `RENDER_DEPLOY_HOOK_URL`.

Railway:

- Dung `railway.json` hoac `Procfile`.
- Neu muon deploy tu dong qua GitHub Actions, them secret `RAILWAY_TOKEN`.
