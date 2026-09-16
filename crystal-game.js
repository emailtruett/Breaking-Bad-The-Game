import * as THREE from './vendor/three.module.js';
// Entirely invented arcade rules: no chemical quantities, temperatures or recipe.
export function createCrystalGame({rv,camera,hands,clearMovement,onClose=()=>{},onBatch=()=>{},canStartBatch=()=>true,canCook=()=>true,onCookingBlocked=()=>{}}){
 const $=s=>document.querySelector(s),clamp=x=>Math.max(0,Math.min(1,x));
 const stages=[['Przygotowanie','Zatrzymaj znacznik w małym zielonym polu. Pięć prób. SPACJA lub przycisk.',.59],['Mieszanie','Naciśnij wskazany klawisz WASD, gdy impuls znajdzie się w środku. Dziesięć taktów.',-2.09],['Podgrzewanie','Utrzymaj biały wskaźnik w ruchomym polu. Przytrzymuj A lub D. Wskaźnik jest umowny.',-3.32],['Krystalizacja','Zapamiętaj kolejność błysków. Odtwórz ją, klikając pola 1–9. Każda pomyłka obniża wynik.',-1.39],['Rozbijanie i porcjowanie','Rozbij osiem brył trafieniami w zielone pole. Następnie rozdziel 18 odłamków równo między trzy pojemniki.',.59]];
 let batchId='batch-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 let gesture=0;
 let step=0,scores=[],best=0,active=false,run=null,result=false,flash='',flashTime=0;
 try{const s=JSON.parse(localStorage.getItem('crystal-arcade-v1'));if(s&&Number.isInteger(s.step)&&s.step>=0&&s.step<=5&&Array.isArray(s.scores)&&s.scores.length===s.step&&s.scores.every(v=>Number.isFinite(v)&&v>=0&&v<=1)){step=s.step;scores=s.scores;if(typeof s.batchId==='string')batchId=s.batchId;best=Number.isFinite(s.best)?Math.max(0,Math.min(99.1,s.best)):0;}}catch{}
 const pressed=new Set(),ray=new THREE.Raycaster(),dir=new THREE.Vector3();
 const root=new THREE.Group();root.name='Fictional crystal arcade props';rv.root.add(root);
 const steel=new THREE.MeshStandardMaterial({color:'#9caaa9',metalness:.65,roughness:.35}),blue=new THREE.MeshPhysicalMaterial({color:'#31bce9',metalness:.08,roughness:.23,transparent:true,opacity:.85});
 const liquidMat=new THREE.MeshPhysicalMaterial({color:'#77cad8',transparent:true,opacity:.65,roughness:.24});
 const liquid=new THREE.Mesh(new THREE.SphereGeometry(.12,20,12),liquidMat);liquid.position.set(-2.09,1.87,-.85);liquid.scale.y=.65;root.add(liquid);
 const slab=new THREE.Mesh(new THREE.BoxGeometry(.38,.035,.24),blue);slab.position.set(-1.39,1.77,-.91);root.add(slab);
 const markerMat=new THREE.MeshStandardMaterial({color:'#5ed5f1',emissive:'#2297bd',emissiveIntensity:.8});
 const marker=new THREE.Mesh(new THREE.TorusGeometry(.075,.006,8,32),markerMat);marker.rotation.x=-Math.PI/2;root.add(marker);
 function box(x,y,z,w,h,d,mat=steel){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);root.add(m);return m;}
 box(1.17,1.75,-.90,.32,.07,.25);box(1.17,1.797,-.90,.25,.015,.20);box(1.17,1.782,-.76,.10,.027,.008,markerMat);
 for(const x of[-3.32,-2.09])box(x,1.727,-.85,.36,.025,.32);
 const crystals=[];for(let i=0;i<24;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.021+(i%4)*.006),blue);m.position.set(.36+(i%6)*.082,1.773+Math.floor(i/6)*.004,-1.02+Math.floor(i/6)*.07);m.rotation.set(i*.8,i*.7,i*.3);root.add(m);crystals.push(m);}
 const progress=$('#crystal-progress'),hint=$('#crystal-hint'),panel=$('#crystal-panel'),canvas=$('#crystal-game'),ctx=canvas.getContext('2d');
 const quality=()=>scores.length?Math.min(99.1,99.1*Math.pow(scores.reduce((a,b)=>a*b,1),1/scores.length)):0;
 function save(){try{localStorage.setItem('crystal-arcade-v1',JSON.stringify({step,scores,best,batchId}));}catch{}}
 let visualState='';
 function update(){const stateKey=step+':'+scores.join(',');if(stateKey===visualState)return;visualState=stateKey;if(step>=4)blue.color.copy(new THREE.Color('#f3f2eb').lerp(new THREE.Color('#007cd9'),Math.pow(quality()/99.1,1.2)));progress.textContent=step===5?`Partia ukończona · ${quality().toFixed(1)}%`:`Partia · ${step+1}/5 · ${stages[step][0]}`;marker.position.set(stages[Math.min(step,4)][2],1.77,-.53);crystals.forEach(m=>m.visible=step===5);slab.visible=step===4;liquid.visible=step>=1&&step<4;liquidMat.color.set(step>=3?'#299fda':'#77cad8');}
 function reachable(){if(active||rv.cutaway||hands.busy||!rv.isInside(camera.position))return false;const target=rv.world(stages[Math.min(step,4)][2],1.94,-.70);if(camera.position.distanceTo(target)>1.85)return false;camera.getWorldDirection(dir);const delta=target.clone().sub(camera.position);if(dir.dot(delta.normalize())<.80)return false;rv.root.updateMatrixWorld(true);ray.far=camera.position.distanceTo(target);ray.set(camera.position,target.clone().sub(camera.position).normalize());const hit=ray.intersectObject(rv.root,true).find(h=>{for(let p=h.object;p;p=p.parent)if(!p.visible)return false;return true;});return !hit||hit.distance>=camera.position.distanceTo(target)-.48;}
 function feedback(t){flash=t;flashTime=1;gesture=1;}
 function open(){if(!reachable())return false;if(!canCook()){onCookingBlocked();return false;}active=true;result=step===5;panel.hidden=false;document.body.classList.add('crystal-active');document.exitPointerLock?.();clearMovement();hands.cancel();pressed.clear();if(!run&&!result)run={t:0,n:0,total:0,phase:Math.random()*6,target:.5,pos:.5,good:0,seq:Array.from({length:8},()=>Math.floor(Math.random()*9)),index:0,mistakes:0,bins:[0,0,0],pieces:0};$('#crystal-title').textContent=result?'Partia ukończona':stages[step][0];$('#crystal-help').textContent=result?'Wynik zależy od wszystkich pięciu etapów. Maksimum: 99,1%.':stages[step][1];$('#crystal-close').focus?.();draw();return true;}
 function close(){const wasActive=active;hands.clearStation?.();active=false;panel.hidden=true;document.body.classList.remove('crystal-active');pressed.clear();clearMovement();if(wasActive)onClose();}
 function finish(score){if(!canCook())return;hands.clearStation?.();scores.push(clamp(score));step++;best=Math.max(best,quality()*(step===5?1:0));run=null;result=true;save();if(step===5)onBatch(batchId,quality());update();$('#crystal-title').textContent=step===5?'Partia ukończona':'Etap zakończony';$('#crystal-help').textContent=step===5?'Niebieskie kryształy czekają na tacy. Nowa partia zeruje bieżący wynik.':`Następne stanowisko: ${stages[step][0]}. Zamknij panel i podejdź do błękitnego znacznika.`;draw();}
 function cursor(){return .5+.46*Math.sin(run.t*(step===4?3.7:3.1)+run.phase)+.025*Math.sin(run.t*9);}
 function hit(){if(!canCook())return;if(!active||result||!run)return;if(step===0||step===4&&run.n<8){const err=Math.abs(cursor()-run.target);const score=clamp(1-Math.max(0,err-.012)/(.13));run.total+=score;run.n++;feedback(score>.95?'Precyzyjnie':score>.5?'Niedokładność':'Błąd');run.target=.19+Math.random()*.62;run.phase+=.9;if(step===0&&run.n===5)finish(run.total/5);else if(step===4&&run.n===8){run.t=0;feedback('Porcjuj: Q / W / E');}}}
 const arrowKeys=['KeyA','KeyW','KeyD','KeyS'];
 function arrow(code){if(!canCook())return;if(step!==1||!run||result)return;const expected=run.seq[run.n%8]%4;const phase=(run.t%1.05)/1.05;const err=Math.abs(phase-.5);const score=arrowKeys[expected]===code?clamp(1-Math.max(0,err-.025)/(.16)):0;run.total+=score;run.n++;run.t=Math.ceil(run.t/1.05)*1.05;feedback(score>.9?'W rytmie':'Utrata rytmu');if(run.n>=10)finish(run.total/10);}
 function cell(i){if(!canCook())return;if(!run||result||step!==3||run.t<4.8)return;const ok=i===run.seq[run.index];if(!ok)run.mistakes++;run.index++;feedback(ok?'Dobrze':'Pomyłka');if(run.index===8)finish(clamp(1-run.mistakes*.16-Math.max(0,run.t-12)*.018));}
 function bin(i){if(!canCook())return;if(!run||result||step!==4||run.n<8)return;run.bins[i]++;run.pieces++;if(run.pieces===18){const balance=clamp(1-run.bins.reduce((s,b)=>s+Math.abs(b-6),0)/18);finish(run.total/8*.7+balance*.3);}}
 function key(e){if(!active)return false;if(e.code==='Escape'){close();return true;}if(e.repeat){e.preventDefault?.();return true;}pressed.add(e.code);if(e.code==='Space')hit();if(arrowKeys.includes(e.code))arrow(e.code);if(/^Digit[1-9]$/.test(e.code))cell(Number(e.code.slice(-1))-1);if(['KeyQ','KeyW','KeyE'].includes(e.code))bin(['KeyQ','KeyW','KeyE'].indexOf(e.code));e.preventDefault?.();return true;}
 function up(e){pressed.delete(e.code);}
 $('#crystal-close').onclick=close;$('#crystal-action').onclick=()=>{if(!canCook()){onCookingBlocked();return;}if(result){if(step===5){if(!canStartBatch())return;batchId='batch-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);step=0;scores=[];save();update();result=false;}close();}else hit();};
 for(let i=0;i<4;i++)$('#crystal-arrow-'+i).onclick=()=>arrow(arrowKeys[i]);
 for(let i=0;i<9;i++)$('#crystal-cell-'+i).onclick=()=>cell(i);
 for(let i=0;i<3;i++)$('#crystal-bin-'+i).onclick=()=>bin(i);
 for(const [id,keyName] of [['crystal-left','KeyA'],['crystal-right','KeyD']]){const b=$('#'+id);b.addEventListener('pointerdown',e=>{pressed.add(keyName);b.setPointerCapture?.(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>pressed.delete(keyName));}
 function draw(){
  if(!active)return;ctx.clearRect(0,0,720,290);ctx.fillStyle='#08170c';ctx.fillRect(0,0,720,290);ctx.textAlign='center';
  $('#crystal-action').hidden=!result&&(![0,4].includes(step)||(step===4&&run.n>=8));$('#crystal-action').textContent=result?(step===5?'Nowa partia':'Wróć do RV'):step===4?'Rozbij · SPACJA':'Zatrzymaj · SPACJA';
  $('#crystal-arrows').hidden=result||step!==1;$('#crystal-balance').hidden=result||step!==2;$('#crystal-cells').hidden=result||step!==3;$('#crystal-bins').hidden=result||step!==4||run.n<8;
  ctx.fillStyle='#a4b998';ctx.font='14px monospace';ctx.fillText('FIKCYJNY PROCES • WSKAŹNIKI UMOWNE',360,32);
  if(result){ctx.fillStyle='#9dcf81';ctx.font='56px Georgia';ctx.fillText(quality().toFixed(1)+'%',360,133);ctx.font='16px sans-serif';ctx.fillStyle='#eee9cb';ctx.fillText(step===5?'Czystość partii':'Jakość po '+step+' etapach',360,172);ctx.fillText('Rekord: '+best.toFixed(1)+'%  ·  maksimum 99,1%',360,220);return;}
  if(step===0||step===4&&run.n<8){ctx.fillStyle='#263c20';ctx.fillRect(60,125,600,28);ctx.fillStyle='#8cc568';ctx.fillRect(60+(run.target-.027)*600,119,.054*600,40);ctx.fillStyle='#fff';ctx.fillRect(60+cursor()*600-2,103,4,71);ctx.fillStyle='#eee9cb';ctx.font='22px sans-serif';ctx.fillText((step===0?'Składnik M / fikcyjne odczynniki':'Bryły kryształu')+' · '+run.n+'/'+(step===0?5:8),360,85);}
  else if(step===1){const symbols=['A','W','D','S'];ctx.fillStyle='#9dcf81';ctx.font='80px sans-serif';ctx.fillText(symbols[run.seq[run.n%8]%4],360,139);ctx.fillStyle='#334823';ctx.fillRect(60,190,600,14);ctx.fillStyle='#9cce76';ctx.fillRect(342,183,36,28);ctx.fillStyle='#fff';ctx.fillRect(60+(run.t%1.05)/1.05*600,173,4,47);}
  else if(step===2){ctx.fillStyle='#2a3c24';ctx.fillRect(60,123,600,36);ctx.fillStyle='#7cab56';ctx.fillRect(60+(run.target-.055)*600,118,66,46);ctx.fillStyle='#fff';ctx.fillRect(60+run.pos*600-3,107,6,68);ctx.font='20px sans-serif';ctx.fillStyle='#e1e4be';ctx.fillText('Stabilność układu · '+Math.max(0,Math.ceil(16-run.t))+' s',360,85);}
  else if(step===3){ctx.font='25px sans-serif';ctx.fillStyle='#dbe5c0';ctx.fillText(run.t<4.8?'Zapamiętaj błyski':'Odtwórz sekwencję · '+run.index+'/8',360,105);for(let i=0;i<9;i++)$('#crystal-cell-'+i).classList.toggle('lit',run.t<4.8&&Math.floor(run.t/.6)<8&&run.t%.6<.40&&run.seq[Math.floor(run.t/.6)]===i);}
  else {ctx.font='30px sans-serif';ctx.fillStyle='#b8d58c';ctx.fillText('Odłamki: '+run.pieces+'/18',360,108);ctx.font='24px sans-serif';ctx.fillText(run.bins.join('     /     '),360,166);}
  ctx.font='18px sans-serif';ctx.fillStyle='#e8dbb7';ctx.fillText(flashTime>0?flash:((step===0||step===4&&run.n<8)?'Pozostało '+Math.max(0,Math.ceil(30-run.t))+' s':''),360,257);
 }
 function tick(dt){
  if(active&&!canCook()){close();onCookingBlocked();}
  update();hint.hidden=!reachable();hint.textContent=!canCook()?'Gotowanie zablokowane · RV poza strefą':step===5?'F · obejrzyj wynik partii':`F · ${stages[step][0]}`;
  if(document.hidden){pressed.clear();return;}if(!active||result||!run)return;dt=Math.min(dt,.05);run.t+=dt;flashTime-=dt;gesture=Math.max(0,gesture-dt*3);
  hands.animateStation?.({stage:step,time:run.t,pulse:gesture,x:stages[step][2],portion:step===4&&run.n>=8,adjust:(pressed.has('KeyD')?1:0)-(pressed.has('KeyA')?1:0)});
  if(step===1&&run.t>(run.n+1)*1.05){run.n++;feedback('Pominięty takt');if(run.n>=10){finish(run.total/10);return;}}
  if(step===2){run.target=.5+.25*Math.sin(run.t*.85)+.07*Math.sin(run.t*2.1);run.pos=clamp(run.pos+((pressed.has('KeyD')?1:0)-(pressed.has('KeyA')?1:0))*.57*dt+Math.sin(run.t*2.5+run.phase)*.24*dt);run.good+=clamp(1-Math.max(0,Math.abs(run.pos-run.target)-.022)/(.105))*dt;if(run.t>=16){finish(run.good/16);return;}}
  if((step===0||step===4&&run.n<8)&&run.t>30){finish(run.total/(step===0?5:8)*(step===4?.7:1));return;}
  if(step===3&&run.t>24){finish(clamp(run.index/8-run.mistakes*.16)*.5);return;}
  if(step===4&&run.n>=8&&run.t>22){finish(run.total/8*.7);return;}
  draw();
 }
 save();if(step===5)onBatch(batchId,quality());update();return {root,tick,open,close,key,up,reachable,get active(){return active;},get state(){return {step,scores:[...scores],quality:quality(),best};}};
}
