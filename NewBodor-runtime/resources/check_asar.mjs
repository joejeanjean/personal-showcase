import * as asar from 'file:///D:/code/rea-main/rea-main/node_modules/@electron/asar/lib/asar.js';
import fs from 'fs';

const archive = 'D:/code/NewBodor/NewBodor-runtime/resources/app.asar';
const list = asar.listPackage(archive);
console.log('LOGIN PATHS:', JSON.stringify(list.filter(p => /login\.html$/i.test(p))));
const target = list.find(p => /\\build\\renderer\\windows\\login\.html$/i.test(p)) || list.find(p => /login\.html$/i.test(p));
console.log('using path:', JSON.stringify(target));
const data = asar.extractFile(archive, target);
fs.writeFileSync(archive.replace('app.asar', 'check_login.html'), data);
const s = data.toString('utf8');
console.log('has CONTACTS:', s.includes('CONTACTS'));
console.log('has openContactChat:', s.includes('openContactChat'));
console.log('has 门店巡防:', s.includes('\u95e8\u5e97\u5de1\u9632'));
console.log('has 去加密联调版:', s.includes('\u53bb\u52a0\u5bc6\u8054\u8c03\u7248'));
console.log('len:', s.length);
