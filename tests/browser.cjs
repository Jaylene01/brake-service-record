const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const root = path.resolve(__dirname, '..');
const key = 'weide-brake-service-records';
const warrantyKey = 'weide-warranty-records-v2';
const original = {id:'legacy-service', recordNo:'WDBF-20260927-001', customerName:'Legacy Test', whatsapp:'0123456789', carPlate:'OLD 123', vehicleBrand:'Toyota', carModel:'Voxy', currentMileage:10000, serviceDate:'2026-09-27', fluidType:'DOT 4', intervalMonths:24, mileageInterval:40000, nextDate:'2028-09-27', nextMileage:50000, notes:'Old service record'};
const warranty = JSON.stringify([{id:'untouched-warranty',activationDate:'2026-09-28',warrantyMonths:36}]);
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = fs.readFileSync(file);
    const type = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {'content-type':type});res.end(data);
  } catch { res.writeHead(404).end(); }
});
async function fill(page) {
  for (const [id, value] of Object.entries({customerName:'<img src=x onerror=alert(1)> Test', whatsapp:'012-345 6789', carPlate:'TEST 123', vehicleBrand:'Toyota', carModel:'Alphard', currentMileage:'12500', serviceDate:'2026-01-31', mileageInterval:'40000', notes:'Simulation only'})) await page.locator('#'+id).fill(value);
  await page.locator('#intervalMonths').selectOption('12');
}
async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const profiles = [{name:'desktop', width:1440,height:900}, {name:'phone',width:360,height:800}, {name:'ipad',width:820,height:1180}];
  for (const profile of profiles) {
    console.log(`START ${profile.name}`);
    const engine = profile.name === 'ipad' && !process.env.CHROMIUM_EXECUTABLE ? webkit : chromium;
    const browser = await engine.launch(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']} : {});
    try {
      const context = await browser.newContext({viewport:{width:profile.width,height:profile.height},timezoneId:'Asia/Kuala_Lumpur',hasTouch:profile.name!=='desktop',isMobile:profile.name!=='desktop'});
      context.setDefaultTimeout(15000);
      context.setDefaultNavigationTimeout(15000);
      const page = await context.newPage();
      const errors=[];page.on('pageerror', error=>errors.push(error.message));
      await page.goto(url);
      await page.evaluate(({key,warrantyKey,original,warranty})=>{localStorage.setItem(key,JSON.stringify([original]));localStorage.setItem(warrantyKey,warranty)}, {key,warrantyKey,original,warranty});
      await page.reload();
      assert.equal(await page.locator('#totalRecords').textContent(), '1');
      assert.match(await page.locator('h1').textContent(), /Brake Fluid/);
      await fill(page);
      assert.equal(await page.locator('#nextDatePreview').textContent(), '31 Jan 2027');
      assert.match(await page.locator('#nextMileagePreview').textContent(), /52,500/);
      await page.locator('#saveRecordBtn').click();
      assert.equal(await page.locator('#totalRecords').textContent(), '2');
      assert.equal(await page.locator('#cardDetails img').count(), 0);
      const saved = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
      assert.deepEqual(saved[1], original);
      assert.equal(saved[0].nextDate, '2027-01-31');assert.equal(saved[0].nextMileage,52500);
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),warrantyKey),warranty);
      await page.evaluate(()=>{window.shared=[];window.open=(url)=>window.shared.push(url)});
      await page.locator('#shareBtn').click();
      const share = await page.evaluate(()=>window.shared[0]);
      assert.ok(share.startsWith('https://wa.me/60123456789?text='));
      assert.match(decodeURIComponent(share),/31 Jan 2027/);assert.match(decodeURIComponent(share),/52,500/);
      await page.locator('[data-view=history]').click();
      await page.locator('#searchInput').fill('old 123');assert.equal(await page.locator('.history-item').count(),1);
      await page.locator('.history-main').click();assert.match(await page.locator('#cardDetails').textContent(),/Legacy Test/);
      await page.reload();assert.equal(await page.locator('#totalRecords').textContent(),'2');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
      fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
      await page.screenshot({path:path.join(root,`test-results/${profile.name}.png`),fullPage:true});
      await page.emulateMedia({media:'print'});
      assert.equal(await page.locator('#cardView').isVisible(),true);
      assert.equal(await page.locator('#formView').isVisible(),false);
      await page.emulateMedia({media:'screen'});
      if (engine === chromium) {
        console.log(`${profile.name}: verify offline service worker`);
        await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active);
        await page.reload();
        await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
        await context.setOffline(true);await page.reload();
        assert.equal(await page.locator('#totalRecords').textContent(),'2');
        await context.setOffline(false);
      } else {
        // Playwright documents service-worker automation as Chromium-only.
        // Keep WebKit core flows enabled; physical iPad offline testing is pending.
        console.log('PENDING physical iPad offline/PWA installation (Playwright service-worker automation is Chromium-only)');
      }
      const manifest = await (await context.request.get(url+'manifest.webmanifest')).json();
      assert.equal(manifest.display,'standalone');assert.match(manifest.name,/Brake Fluid/);
      for(const icon of manifest.icons)assert.equal((await context.request.get(url+icon.src.replace('./',''))).status(),200);
      // Backup is the exact raw service value, not a rewritten approximation.
      await page.locator('[data-view=history]').click();
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#backupBtn').click();
      const backupDownload = await downloadPromise;
      const backup = JSON.parse(fs.readFileSync(await backupDownload.path(), 'utf8'));
      assert.equal(backup.rawRecords, await page.evaluate(key=>localStorage.getItem(key),key));
      await page.locator('[data-view=form]').click();
      // A blocked/quota-exceeded write must preserve stored records and unsaved fields.
      const beforeFailure = await page.evaluate(key=>localStorage.getItem(key),key);
      await fill(page);
      await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Test quota exceeded','QuotaExceededError')}});
      await page.locator('#saveRecordBtn').click();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),beforeFailure);
      assert.equal(await page.locator('#currentMileage').inputValue(),'12500');
      assert.match(await page.locator('#message').textContent(),/保存失败/);
      await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);
      // Corrupt storage must remain byte-for-byte unchanged, and inputs stay filled.
      await page.evaluate(key=>localStorage.setItem(key,'broken-original-data'),key);await page.reload();
      await fill(page);await page.locator('#saveRecordBtn').click();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'broken-original-data');
      assert.match(await page.locator('#message').textContent(),/保存失败/);
      assert.equal(await page.locator('#currentMileage').inputValue(),'12500');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${profile.name} (${engine === webkit ? 'WebKit' : 'Chromium'}): legacy history, save/reload, next date/mileage, safe card, search, WhatsApp URL, warranty isolation, responsive width, print, ${engine === chromium ? 'offline shell' : 'offline pending on physical device'}, PWA assets, backup and storage failure protection`);
      await context.close();
    } finally {await browser.close();}
  }
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
