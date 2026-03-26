const fs = require('fs');
const path = require('path');
const historyDir = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'Code', 'User', 'History');
const entries = fs.readdirSync(historyDir, { withFileTypes: true });

let allHtml = [];
for (let d of entries) {
  if (d.isDirectory()) {
    let folder = path.join(historyDir, d.name);
    let files = fs.readdirSync(folder);
    for (let f of files) {
      if (f.endsWith('.html')) {
         let p = path.join(folder, f);
         allHtml.push({ p, t: fs.statSync(p).mtimeMs });
      }
    }
  }
}
allHtml.sort((a,b) => b.t - a.t);
const topFiles = allHtml.slice(0, 50);
for (let f of topFiles) {
  let topBytes = fs.readFileSync(f.p).slice(0, 300).toString('utf-8');
  if (topBytes.includes('DOCTYPE') && !topBytes.includes('admin') && !topBytes.includes('Admin')) {
     if (topBytes.includes('Главное') || topBytes.includes('Black Russia Simulator')) {
       console.log('--- ' + f.p);
       console.log(topBytes.substring(0, 100).replace(/\n/g, '\\n'));
     }
  }
}
