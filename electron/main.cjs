const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path'), fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

let db, dbPath, sql, mainWindow;

const schema = `
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 name TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS years (
 year INTEGER PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS categories (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 year INTEGER NOT NULL,
 name TEXT NOT NULL,
 sort_order INTEGER DEFAULT 0,
 UNIQUE(year,name)
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 year INTEGER NOT NULL,
 category_id INTEGER NOT NULL,
 item_no INTEGER,
 product_name TEXT DEFAULT '',
 product_url TEXT DEFAULT '',
 unit_price REAL,
 purchase_qty TEXT DEFAULT '',
 option1 TEXT DEFAULT '',
 option2 TEXT DEFAULT '',
 coupang_url TEXT DEFAULT '',
 naver_url TEXT DEFAULT '',
 etc TEXT DEFAULT '',
 status TEXT DEFAULT 'draft',
 updated_at TEXT NOT NULL,
 FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_products_year_category ON products(year, category_id);
`;

function now(){ return new Date().toISOString(); }
function saveDb(){
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}
function rows(sqlText, params=[]){
  const stmt=db.prepare(sqlText); stmt.bind(params); const out=[];
  while(stmt.step()) out.push(stmt.getAsObject()); stmt.free(); return out;
}
function run(sqlText, params=[]){
  const stmt=db.prepare(sqlText); stmt.run(params); stmt.free(); saveDb();
}
async function initDb(){
  sql = await initSqlJs({ locateFile: f => path.join(path.dirname(require.resolve('sql.js')), f) });
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir,{recursive:true});
  dbPath = path.join(dataDir,'domeggook-manager.sqlite');
  db = fs.existsSync(dbPath) ? new sql.Database(fs.readFileSync(dbPath)) : new sql.Database();
  db.run(schema);
  const u=rows('SELECT COUNT(*) c FROM users')[0].c;
  if(Number(u)===0){
    const hash=bcrypt.hashSync('admin1234',10);
    run('INSERT INTO users(username,password_hash,name,created_at) VALUES(?,?,?,?)',['admin',hash,'관리자',now()]);
  } else saveDb();
}
function createWindow(){
  // Windows 기본 메뉴(File/Edit/View/Window)를 제거합니다.
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  let rendererReady = false;

  win.once('ready-to-show', () => {
    rendererReady = true;
    win.show();
  });

  win.webContents.on('did-finish-load', () => {
    rendererReady = true;
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Renderer load failed:', errorCode, errorDescription);
  });

  win.on('close', (event) => {
    if (win._forceClose) return;

    // 렌더러가 정상적으로 로드되지 않은 경우에는
    // 종료 확인창 때문에 프로그램이 닫히지 않도록 합니다.
    if (!rendererReady || win.webContents.isDestroyed()) return;

    event.preventDefault();
    win.webContents.send('request-close-decision');
  });

  if (!app.isPackaged) {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    // 패키징된 앱은 app.asar 내부의 dist/index.html을 직접 로드합니다.
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    win.loadFile(indexPath);
  }

  return win;
}

app.whenReady().then(async()=>{ await initDb(); mainWindow=createWindow(); app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)mainWindow=createWindow()}) });
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

ipcMain.handle('renderer-close-decision', async (_, p) => {
 const win = BrowserWindow.getAllWindows()[0];
 if (!win) return {ok:true, action:'close'};
 if (p?.dirty) {
  const result = await dialog.showMessageBox(win, {
   type: 'warning',
   title: '저장되지 않은 데이터',
   message: '입력된 데이타가 있습니다. 그냥 끝내시는가요?',
   detail: '저장 버튼을 누르지 않은 변경사항이 있습니다.',
   buttons: ['저장하고 종료', '저장하지 않고 종료', '취소'],
   defaultId: 0,
   cancelId: 2,
   noLink: true
  });
  if (result.response === 0) return {ok:true, action:'save-and-close'};
  if (result.response === 1) return {ok:true, action:'discard-and-close'};
  return {ok:false, action:'cancel'};
 }
 return {ok:true, action:'close'};
});

ipcMain.handle('force-close', () => {
 const win = BrowserWindow.getAllWindows()[0];
 if (win) { win._forceClose = true; win.close(); }
 return {ok:true};
});

ipcMain.handle('login',(_,p)=>{
 const u=rows('SELECT * FROM users WHERE username=?',[p.username])[0];
 if(!u || !bcrypt.compareSync(p.password,u.password_hash)) return {ok:false,message:'아이디 또는 비밀번호가 올바르지 않습니다.'};
 return {ok:true,user:{id:u.id,username:u.username,name:u.name}};
});
ipcMain.handle('change-password',(_,p)=>{
 const u=rows('SELECT * FROM users WHERE id=?',[p.userId])[0];
 if(!u || !bcrypt.compareSync(p.currentPassword,u.password_hash)) return {ok:false,message:'현재 비밀번호가 올바르지 않습니다.'};
 run('UPDATE users SET password_hash=? WHERE id=?',[bcrypt.hashSync(p.newPassword,10),p.userId]);
 return {ok:true};
});
ipcMain.handle('get-years',()=>rows('SELECT year FROM years ORDER BY year DESC'));
ipcMain.handle('ensure-year',(_,year)=>{ run('INSERT OR IGNORE INTO years(year) VALUES(?)',[year]); return {ok:true}; });
ipcMain.handle('get-categories',(_,year)=>rows('SELECT * FROM categories WHERE year=? ORDER BY sort_order,name',[year]));
ipcMain.handle('add-category',(_,p)=>{
 const y=Number(p.year);
 const name=String(p.name||'').trim();
 if(!y || !name) return {ok:false,message:'연도와 카테고리 이름을 확인해 주세요.'};
 const exists=rows('SELECT id FROM categories WHERE year=? AND name=?',[y,name])[0];
 if(exists) return {ok:false,message:'같은 이름의 카테고리가 이미 있습니다.',id:exists.id};
 run('INSERT INTO years(year) VALUES(?) ON CONFLICT(year) DO NOTHING',[y]);
 run('INSERT INTO categories(year,name,sort_order) VALUES(?,?,COALESCE((SELECT MAX(sort_order)+1 FROM categories WHERE year=?),0))',[y,name,y]);
 const created=rows('SELECT id FROM categories WHERE year=? AND name=?',[y,name])[0];
 return {ok:true,id:created?.id};
});
ipcMain.handle('rename-category',(_,p)=>{
 const name=String(p.name||'').trim();
 if(!name) return {ok:false,message:'카테고리 이름을 입력해 주세요.'};
 const c=rows('SELECT year FROM categories WHERE id=?',[p.id])[0];
 if(!c) return {ok:false,message:'카테고리를 찾을 수 없습니다.'};
 const dup=rows('SELECT id FROM categories WHERE year=? AND name=? AND id<>?',[c.year,name,p.id])[0];
 if(dup) return {ok:false,message:'같은 이름의 카테고리가 이미 있습니다.'};
 run('UPDATE categories SET name=? WHERE id=?',[name,p.id]);
 return {ok:true};
});
ipcMain.handle('delete-category',(_,id)=>{const n=rows('SELECT COUNT(*) c FROM products WHERE category_id=?',[id])[0].c;if(Number(n))return{ok:false,message:'상품이 있는 카테고리는 삭제할 수 없습니다.'};run('DELETE FROM categories WHERE id=?',[id]);return{ok:true}});
ipcMain.handle('get-products',(_,p)=>{
 const list=rows(`SELECT * FROM products WHERE year=? AND category_id=? ORDER BY COALESCE(item_no,999999),updated_at DESC,id DESC`,[p.year,p.categoryId]);
 return list;
});
ipcMain.handle('save-product',(_,p)=>{
 const id = p.id == null || p.id === '' ? null : Number(p.id);
 const y = Number(p.year);
 const categoryId = Number(p.category_id);
 if(!y || !categoryId) return {ok:false,message:'연도 또는 카테고리 정보가 없습니다.'};

 const values = [
  p.item_no === '' || p.item_no == null ? null : Number(p.item_no),
  String(p.product_name || ''),
  String(p.product_url || ''),
  p.unit_price === '' || p.unit_price == null ? null : Number(p.unit_price),
  String(p.purchase_qty || ''),
  String(p.option1 || ''),
  String(p.option2 || ''),
  String(p.coupang_url || ''),
  String(p.naver_url || ''),
  String(p.etc || ''),
  String(p.status || 'draft'),
  now()
 ];

 if(id){
  const exists=rows('SELECT id FROM products WHERE id=?',[id])[0];
  if(!exists) return {ok:false,message:'수정할 상품을 찾을 수 없습니다.'};
  run(`UPDATE products SET year=?,category_id=?,item_no=?,product_name=?,product_url=?,unit_price=?,purchase_qty=?,option1=?,option2=?,coupang_url=?,naver_url=?,etc=?,status=?,updated_at=? WHERE id=?`,
   [y,categoryId,...values,id]);
  return {ok:true,id};
 }

 run(`INSERT INTO products(year,category_id,item_no,product_name,product_url,unit_price,purchase_qty,option1,option2,coupang_url,naver_url,etc,status,updated_at)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [y,categoryId,...values]);
 const created=rows('SELECT last_insert_rowid() id')[0];
 return {ok:true,id:Number(created.id)};
});
ipcMain.handle('delete-product',(_,id)=>{run('DELETE FROM products WHERE id=?',[id]);return{ok:true}});
ipcMain.handle('cleanup-legacy-duplicates', (_, p) => {
 const year = Number(p.year);
 const categoryId = Number(p.categoryId);
 const list = rows(`SELECT * FROM products WHERE year=? AND category_id=? ORDER BY id`, [year, categoryId]);
 const fields = ['item_no','product_name','product_url','unit_price','purchase_qty','option1','option2','coupang_url','naver_url','etc'];
 const value = (v) => v == null ? '' : String(v).trim();
 const score = (x) => fields.reduce((n,f)=>n + (value(x[f]) !== '' ? 1 : 0), 0);
 const deleted = new Set();

 // V1.4의 자동 저장 버그로 만들어진 "입력 중간 스냅샷"만 정리합니다.
 // 오래된 A의 모든 입력값이 최신 B에 그대로 포함되고 B가 더 완성된 경우 A를 중복으로 판단합니다.
 for (let i=0; i<list.length; i++) {
  const a=list[i];
  if (deleted.has(a.id)) continue;
  for (let j=i+1; j<list.length; j++) {
   const b=list[j];
   if (deleted.has(b.id)) continue;
   if (value(a.product_name) === '' || value(b.product_name) === '') continue;
   if (value(a.product_name) !== value(b.product_name)) continue;
   let subset=true;
   for (const f of fields) {
    const av=value(a[f]), bv=value(b[f]);
    if (av !== '' && av !== bv) { subset=false; break; }
   }
   if (subset && score(b) > score(a)) {
    deleted.add(a.id);
    break;
   }
  }
 }

 // 완전히 빈 행은 같은 카테고리에 실제 상품이 하나라도 있으면 V1.4 테스트 잔재로 판단합니다.
 const hasRealProduct = list.some(x => value(x.product_name) !== '');
 if (hasRealProduct) {
  for (const x of list) {
   if (score(x) === 0) deleted.add(x.id);
  }
 }

 for (const id of deleted) run('DELETE FROM products WHERE id=?', [id]);
 return {ok:true, deleted:deleted.size};
});
ipcMain.handle('backup',async()=>{
 const {filePath}=await dialog.showSaveDialog({title:'백업 저장',defaultPath:`도매꾹_상품관리_백업_${new Date().toISOString().slice(0,10)}.sqlite`});
 if(!filePath)return{ok:false,canceled:true}; saveDb(); fs.copyFileSync(dbPath,filePath); return{ok:true,path:filePath};
});
ipcMain.handle('export-excel',async(_,p)=>{
 const {filePath}=await dialog.showSaveDialog({title:'엑셀 다운로드',defaultPath:`${p.year}년_도매꾹_상품리스트.xlsx`,filters:[{name:'Excel',extensions:['xlsx']}]});
 if(!filePath)return{ok:false,canceled:true};
 const wb=new ExcelJS.Workbook();
 const cats=rows('SELECT * FROM categories WHERE year=? ORDER BY sort_order,name',[p.year]);
 for(const c of cats){
  const ws=wb.addWorksheet(c.name.slice(0,31));
  ws.addRow(['번호','상품명','상품URL','단가','구매수량','옵션','옵션2','비교URL-쿠팡','비교URL-네이버','기타']);
  const ps=rows('SELECT * FROM products WHERE year=? AND category_id=? ORDER BY COALESCE(item_no,999999),id',[p.year,c.id]);
  for(const x of ps) ws.addRow([x.item_no,x.product_name,x.product_url,x.unit_price,x.purchase_qty,x.option1,x.option2,x.coupang_url,x.naver_url,x.etc]);
  ws.getRow(1).font={bold:true}; ws.views=[{state:'frozen',ySplit:1}]; ws.columns.forEach(col=>col.width=22); ws.getColumn(2).width=45; ws.getColumn(3).width=55;
 }
 if(wb.worksheets.length===0) wb.addWorksheet('상품리스트');
 await wb.xlsx.writeFile(filePath); return{ok:true,path:filePath};
});
ipcMain.handle('import-excel',async()=>{
 const {filePaths}=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Excel',extensions:['xlsx','xls']}]});
 if(!filePaths?.[0])return{ok:false,canceled:true};
 const file=filePaths[0], wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
 let imported=0;
 for(const ws of wb.worksheets){
  const yearMatch=path.basename(file).match(/(20\\d{2})/); const year=yearMatch?Number(yearMatch[1]):new Date().getFullYear();
  run('INSERT OR IGNORE INTO years(year) VALUES(?)',[year]);
  run('INSERT OR IGNORE INTO categories(year,name,sort_order) VALUES(?,?,?)',[year,ws.name,0]);
  const cat=rows('SELECT id FROM categories WHERE year=? AND name=?',[year,ws.name])[0];
  ws.eachRow((row,n)=>{
   if(n===1)return;
   const v=row.values; if(!v || !v[2])return;
   const product={year,category_id:cat.id,item_no:v[1],product_name:v[2],product_url:v[3],unit_price:v[4],purchase_qty:v[5],option1:v[6],option2:v[7],coupang_url:v[8],naver_url:v[9],etc:v[10],status:'saved'};
   run(`INSERT INTO products(year,category_id,item_no,product_name,product_url,unit_price,purchase_qty,option1,option2,coupang_url,naver_url,etc,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
   [product.year,product.category_id,product.item_no||null,product.product_name||'',product.product_url||'',product.unit_price||null,product.purchase_qty||'',product.option1||'',product.option2||'',product.coupang_url||'',product.naver_url||'',product.etc||'',product.status,now()]);
   imported++;
  });
 }
 return{ok:true,imported};
});
