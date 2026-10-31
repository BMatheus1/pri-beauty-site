const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=path.join(root,'convite'),output=path.join(root,'dist/convite');
const required=['index.html','convite.css','convite.js','scene.js','reveal.js','config.js','vendor/gsap.min.js','assets/opening.mp4','assets/opening-poster.webp','handoff-config.js','assets/handoff-frame.png','assets/handoff-card-top.webp'];
for(const file of required)assert.ok(fs.existsSync(path.join(source,file)),`Missing ${file}`);
for(const file of ['convite.js','scene.js'])assert.ok(!/three\.module|WebGLRenderer|createSatinBow/.test(fs.readFileSync(path.join(source,file),'utf8')));
assert.ok(!fs.readFileSync(path.join(source,'index.html'),'utf8').includes('Realçando a sua beleza natural'));
fs.mkdirSync(output,{recursive:true});fs.cpSync(source,output,{recursive:true});
for(const name of ['index.html','styles.css','script.js'])fs.copyFileSync(path.join(root,name),path.join(root,'dist',name));
console.log(`Static invitation build passed: ${required.length} required assets checked. Other site sections preserved.`);
