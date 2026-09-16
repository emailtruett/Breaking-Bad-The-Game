import { createBatchBag } from './batch-bag.js';
import * as THREE from './vendor/three.module.js';
export function createInventory({rv,camera,hands,onClose=()=>{},notice=()=>{},clearMovement=()=>{}}){
 const $=s=>document.querySelector(s),CAP=12;
 let slots=Array(5).fill(null),stored=Array(CAP).fill(null),pending=[],received=[],selected=0,mode='storage',active=false,action=null,doorTarget=0,model=null,modelKey='',clock=0;
 const valid=i=>i&&typeof i.id==='string'&&i.id.length<100&&Number.isFinite(i.purity)&&i.purity>=0&&i.purity<=99.1;
 try{const s=JSON.parse(localStorage.getItem('rv-inventory-v1'));if(s&&Array.isArray(s.slots)&&s.slots.length===5&&Array.isArray(s.stored)&&s.stored.length===CAP){const seen=new Set();const clean=i=>{if(!valid(i)||seen.has(i.id))return null;seen.add(i.id);return {id:i.id,purity:i.purity,...(i.spill?{spill:true}:{})};};slots=s.slots.map(clean);stored=s.stored.map(clean);pending=(Array.isArray(s.pending)?s.pending:[]).map(clean).filter(Boolean);received=Array.isArray(s.received)?s.received.filter(i=>typeof i==='string'):[];selected=Number.isInteger(s.selected)?Math.max(0,Math.min(4,s.selected)):0;}}catch{}
 const root=new THREE.Group();root.name='Stored crystal batches';rv.root.add(root);
 const held=new THREE.Group();held.name='Inventory held batch';hands.right.grip.add(held);
 const tint=p=>new THREE.Color('#f3f2eb').lerp(new THREE.Color('#007cd9'),Math.pow(p/99.1,1.2));
 function save(){try{localStorage.setItem('rv-inventory-v1',JSON.stringify({slots,stored,pending,received,selected}));}catch{}}
 function dispose(g){g.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of(Array.isArray(o.material)?o.material:[o.material])){for(const key of ['map','normalMap','bumpMap'])m[key]?.dispose();m.dispose();}}});g.removeFromParent();}
 const bag=createBatchBag;
 function update(){
  for(let i=0;i<5;i++){const b=$('#slot-'+i);b.textContent=(i+1)+' · '+(slots[i]?slots[i].purity.toFixed(1)+'%':'—');b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',String(i===selected));b.style.setProperty?.('--batch-color',slots[i]?'#'+tint(slots[i].purity).getHexString():'#536451');b.title=slots[i]?'Partia · '+slots[i].purity.toFixed(1)+'%':'Pusty slot';}
  $('#inventory-name').textContent=slots[selected]?'Partia · czystość '+slots[selected].purity.toFixed(1)+'%':'Pusty slot';
  $('#storage-instructions').textContent=mode==='trash'?'1–5 · wybierz przedmiot   F · zamknij':'1–5 · wybór slotu   F · zamknij. Kliknij paczkę w schowku, aby ją wyjąć.';
  $('#storage-title').textContent=mode==='trash'?'Kosz pod zlewem':'Schowek';
  $('.storage-grid').hidden=mode==='trash';$('#storage-deposit').hidden=mode==='trash';$('#trash-discard').hidden=mode!=='trash';$('#trash-discard').disabled=!!action||!slots[selected];$('#trash-discard').textContent=slots[selected]?'Wyrzuć bezpowrotnie · '+slots[selected].purity.toFixed(1)+'%':'Wybierz zajęty slot 1–5';
  $('#storage-status').textContent=mode==='trash'?'Wybierz slot 1–5. Wyrzucony przedmiot znika na zawsze.':pending.length?'Trwa odbiór partii.':`${stored.filter(Boolean).length}/${CAP} miejsc · wybierz paczkę, aby ją wyjąć`;
  $('#storage-deposit').disabled=!!action||!slots[selected]||!stored.includes(null);$('#storage-deposit').textContent=slots[selected]?'Schowaj wybraną · '+slots[selected].purity.toFixed(1)+'%':'Wybierz zajęty slot 1–5';
  for(let i=0;i<CAP;i++){const b=$('#stored-'+i);b.textContent=stored[i]?stored[i].purity.toFixed(1)+'%':'Pusto';b.disabled=!!action||!stored[i]||!slots.includes(null);}
 }
 function refreshStored(){while(root.children.length)dispose(root.children[0]);stored.forEach((item,i)=>{if(!item)return;const g=bag(item);g.scale.setScalar(.58);g.position.set(-2.13+(i%4)*.15,1.04+Math.floor(i/4)*.15,.92);root.add(g);});}
 const ray=new THREE.Raycaster();
 function reachable(kind='storage'){
  if(active||action||rv.cutaway||hands.busy||!rv.isInside(camera.position))return false;
  const door=kind==='trash'?rv.trashDoor:rv.storageDoor;if(!door)return false;
  door.updateWorldMatrix(true,true);
  ray.far=1.8;ray.set(camera.position,camera.getWorldDirection(new THREE.Vector3()));
  // Reject off-target views against the tiny door mesh before tracing the entire RV.
  if(!ray.intersectObject(door,true).length)return false;
  rv.root.updateMatrixWorld(true);
  const hit=ray.intersectObject(rv.root,true).find(h=>{for(let p=h.object;p;p=p.parent)if(!p.visible)return false;return true;});
  if(!hit||hit.distance>1.8)return false;
  for(let p=hit.object;p;p=p.parent)if(p===door)return true;
  return false;
 }

 function open(){const kind=reachable('trash')?'trash':reachable('storage')?'storage':null;if(!kind)return false;mode=kind;active=true;doorTarget=1;clearMovement();hands.cancel();$('#storage-panel').hidden=false;document.body.classList.add('storage-active');document.exitPointerLock?.();action={type:'open',t:0};update();return true;}
 function close(resume=true){const was=active;active=false;doorTarget=0;$('#storage-panel').hidden=true;document.body.classList.remove('storage-active');clearMovement();if(was&&resume)onClose();}
 function select(i){if(action)return;selected=i;save();update();}
 function move(type,i){if(!active||action||mode!=='storage')return false;const from=type==='deposit'?slots:stored,to=type==='deposit'?stored:slots;const dest=to.indexOf(null);if(!from[i]||dest<0)return false;action={type,t:0,item:from[i],source:i,dest};update();return true;}
 function discard(){if(!active||mode!=='trash'||action||!slots[selected])return false;action={type:'trash',t:0,item:slots[selected],source:selected};update();return true;}
 function queueBatch(id,purity){if(received.includes(id)||pending.some(i=>i.id===id)||slots.some(i=>i?.id===id)||stored.some(i=>i?.id===id))return;const spill=!slots.includes(null);pending.push({id,purity:Math.max(0,Math.min(99.1,purity)),...(spill?{spill:true}:{})});if(spill)received.push(id);save();notice(spill?'Ekwipunek pełny — woreczek nie mieści się w dłoni…':'Pakowanie ukończonej partii…');update();}
 function key(e){if(/^Digit[1-5]$/.test(e.code)&&!e.repeat){select(Number(e.code.slice(-1))-1);e.preventDefault?.();return true;}if(active){if(e.code==='KeyF'&&!e.repeat)close();return true;}return false;}
 for(let i=0;i<5;i++)$('#slot-'+i).onclick=()=>select(i);
 for(let i=0;i<CAP;i++)$('#stored-'+i).onclick=()=>move('withdraw',i);
 $('#trash-discard').onclick=discard;
 $('#storage-deposit').onclick=()=>move('deposit',selected);$('#storage-close').onclick=()=>close();
 let spillMesh=null,spillOrigin=null,trashVisual=null;
 function burst(a){
  a.burst=true;if(modelKey!==a.item.id){if(model)dispose(model);model=bag(a.item);modelKey=a.item.id;held.add(model);model.position.set(0,.105,-.005);model.rotation.set(.05,0,Math.PI);}
  pending=pending.filter(i=>i.id!==a.item.id);if(!received.includes(a.item.id))received.push(a.item.id);save();
  notice('Woreczek pękł. Partia '+a.item.purity.toFixed(1)+'% została bezpowrotnie utracona.');
  rv.root.updateWorldMatrix(true,false);held.updateWorldMatrix(true,true);
  spillOrigin=rv.root.worldToLocal(model?model.localToWorld(new THREE.Vector3(0,-.095,0)):rv.world(.59,1.85,-.65));
  spillMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.007,0),new THREE.MeshStandardMaterial({color:tint(a.item.purity),roughness:.28,transparent:true,opacity:1}),180);spillMesh.name='Spilled batch — cosmetic only';spillMesh.frustumCulled=false;rv.root.add(spillMesh);
  if(model){const crystals=model.getObjectByName('Individual crystal facets');if(crystals)crystals.visible=false;
   const film=model.getObjectByName('Supplied wrinkled ziplock film');if(film){const p=film.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<-.045){const rip=Math.min(1,(-y-.045)/.07);p.setX(i,p.getX(i)+(p.getX(i)>0?1:-1)*rip*.028);p.setZ(i,p.getZ(i)+Math.sin(p.getX(i)*60)*rip*.021);}}p.needsUpdate=true;film.geometry.computeVertexNormals();}
  }
 }
 function scatter(t){if(!spillMesh)return;const matrix=new THREE.Object3D();for(let i=0;i<180;i++){const delay=(i%13)*.018,u=Math.max(0,t-delay),angle=i*2.39996,speed=.13+(i%9)*.036;matrix.position.copy(spillOrigin).add(new THREE.Vector3(Math.cos(angle)*speed*u,-.10*u-2.7*u*u,Math.sin(angle)*speed*u));matrix.position.y=Math.max(.94,matrix.position.y);matrix.rotation.set(i+u*4,i*.7+u*3,i*.3);matrix.scale.setScalar(.6+(i%5)*.16);matrix.updateMatrix();spillMesh.setMatrixAt(i,matrix.matrix);}spillMesh.instanceMatrix.needsUpdate=true;spillMesh.material.opacity=Math.max(0,1-Math.max(0,t-.65)/.85);}
 function tick(dt,{blocked=false,paused=false}={}){
  clock+=dt;rv.storageDoor.rotation.y=THREE.MathUtils.damp(rv.storageDoor.rotation.y,doorTarget&&mode==='storage'?1.85:0,7,dt);if(rv.trashDoor)rv.trashDoor.rotation.y=THREE.MathUtils.damp(rv.trashDoor.rotation.y,doorTarget&&mode==='trash'?-1.75:0,7,dt);
  if(!action&&!blocked&&pending.length){action={type:pending[0].spill||!slots.includes(null)?'spill':'collect',t:0,item:pending[0],dest:slots.indexOf(null)};clearMovement();update();}
  if(action&&!paused){action.t+=dt;if(action.type==='trash'&&action.t>=.58&&!action.released){action.released=true;trashVisual=bag(action.item);trashVisual.position.set(-.91,1.48,-.88);trashVisual.rotation.set(-.25,0,.18);rv.root.add(trashVisual);slots[action.source]=null;if(!received.includes(action.item.id))received.push(action.item.id);save();notice('Przedmiot wyrzucony bezpowrotnie.');update();}if(action.type==='trash'&&trashVisual){const drop=Math.max(0,action.t-.58);trashVisual.position.y=1.48-1.4*drop*drop;trashVisual.rotation.z=.18+drop*.8;}if(action.type==='spill'&&action.t>=.62){if(!action.burst)burst(action);scatter(action.t-.62);}if(action.t>=(action.type==='open'?.4:action.type==='spill'?2.2:1.15)){
   const a=action;if(a.type==='collect'){slots[a.dest]=a.item;pending=pending.filter(i=>i.id!==a.item.id);received.push(a.item.id);selected=a.dest;notice('Partia '+a.item.purity.toFixed(1)+'% → slot '+(a.dest+1));}
   else if(a.type==='spill'){pending=pending.filter(i=>i.id!==a.item.id);if(!received.includes(a.item.id))received.push(a.item.id);if(spillMesh){dispose(spillMesh);spillMesh=null;}}
   else if(a.type==='trash'){if(trashVisual){dispose(trashVisual);trashVisual=null;}}
   else if(a.type==='deposit'){stored[a.dest]=a.item;slots[a.source]=null;}
   else if(a.type==='withdraw'){slots[a.dest]=a.item;stored[a.source]=null;selected=a.dest;}
   action=null;save();refreshStored();update();
  }}
  const item=action?.item||slots[selected];const itemKey=item?.id||'';
  if(itemKey!==modelKey){if(model)dispose(model);model=item?bag(item):null;modelKey=itemKey;if(model){held.add(model);model.position.set(0,.105,-.005);model.rotation.set(.05,0,Math.PI);}}
  held.visible=!!item&&!blocked&&(!active||!!action?.item)&&!((action?.type==='deposit'||action?.type==='trash')&&action.t>.58);root.visible=!rv.cutaway;
  if(action?.item&&!blocked){const target=action.type==='trash'?rv.world(-.91,1.40,-.77):(action.type==='collect'||action.type==='spill')?rv.world(.59,1.88,-.65):rv.world(-1.90,1.35,.59);hands.animateItemTransfer?.({target,progress:Math.min(1,action.t/1.15),put:action.type==='deposit'||action.type==='trash',release:action.type==='trash'&&action.released});}
  else if(item&&!blocked&&!active)hands.holdInventoryItem?.();
  const hint=$('#storage-hint');const nearTrash=reachable('trash');hint.hidden=paused||blocked||(!nearTrash&&!reachable());hint.textContent=nearTrash?'F · szafka ze śmietnikiem':'F · schowek';
 }
 update();refreshStored();return {root,held,tick,open,close,key,queueBatch,move,discard,select,reachable,get active(){return active;},get busy(){return !!action;},get pending(){return pending.length>0||action?.type==='spill';},get state(){return {slots:slots.map(i=>i&&({...i})),stored:stored.map(i=>i&&({...i})),pending:pending.map(i=>({...i})),selected};}};
}
