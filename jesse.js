import * as THREE from './vendor/three.module.js';
import { JESSE_HEAD_DATA } from './assets/jesse-head.js';
import { JESSE_SUIT_DATA } from './assets/jesse-suit.js';

// Static, full-scale character. The supplied ko6i / Avatar SDK head is retained.
// Clothing is reconstructed from the reference; head and hair retain the supplied bust.
// Static character with the original head and hair.
export function createJesse({scene,rv,height}) {
 const root=new THREE.Group();root.name='Jesse Pinkman — static hazmat outfit';
 const suit=new THREE.Group();suit.name='Yellow protective coverall';root.add(suit);
 const hardware=new THREE.Group();hardware.name='Seams, closures and equipment';root.add(hardware);
 const boots=new THREE.Group();boots.name='Protective boot covers';root.add(boots);
 const gloves=new THREE.Group();gloves.name='Relaxed gloved hands';root.add(gloves);
 let seed=28611;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
 function microTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const cx=c.getContext('2d');cx.fillStyle='#8b8b8b';cx.fillRect(0,0,512,512);
  for(let i=0;i<27000;i++){const g=105+Math.floor(random()*62);cx.fillStyle=`rgb(${g},${g},${g})`;cx.fillRect(random()*512,random()*512,random()*3+.3,.6);}
  for(let i=0;i<512;i+=3){cx.fillStyle='rgba(44,44,44,.13)';cx.fillRect(i,0,.6,512);cx.fillRect(0,i,512,.5);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,5);t.anisotropy=4;return t;}
 const micro=microTexture();
 const M={
  yellow:new THREE.MeshPhysicalMaterial({color:'#d5c52b',roughness:.57,metalness:0,clearcoat:.16,clearcoatRoughness:.55,bumpMap:micro,bumpScale:.00042,side:THREE.DoubleSide}),
  seam:new THREE.MeshStandardMaterial({color:'#bbaf33',roughness:.78}),
  lining:new THREE.MeshStandardMaterial({color:'#cccdb2',roughness:.84,side:THREE.DoubleSide}),
  thread:new THREE.MeshStandardMaterial({color:'#d7d8ae',roughness:.85}),
  shirt:new THREE.MeshStandardMaterial({color:'#5b5e43',roughness:.98,bumpMap:micro,bumpScale:.0003,side:THREE.DoubleSide}),
  skin:new THREE.MeshStandardMaterial({color:'#b9927f',roughness:.70}),
  blue:new THREE.MeshPhysicalMaterial({color:'#5b8099',roughness:.60,clearcoat:.08,bumpMap:micro,bumpScale:.00014}),
  blueDark:new THREE.MeshStandardMaterial({color:'#496c81',roughness:.75}),
  rubber:new THREE.MeshStandardMaterial({color:'#333831',roughness:.85}),
  gasket:new THREE.MeshStandardMaterial({color:'#49483b',roughness:.70}),
  strap:new THREE.MeshStandardMaterial({color:'#34372f',roughness:.94,bumpMap:micro,bumpScale:.00025}),
  metal:new THREE.MeshStandardMaterial({color:'#9b9d8c',metalness:.72,roughness:.33}),
  pink:new THREE.MeshPhysicalMaterial({color:'#a86479',roughness:.51,clearcoat:.11}),
  pinkRim:new THREE.MeshStandardMaterial({color:'#895668',roughness:.58}),
  filterBand:new THREE.MeshStandardMaterial({color:'#b8ac64',roughness:.78}),
  visor:new THREE.MeshPhysicalMaterial({color:'#b6c6ac',transparent:true,opacity:.22,roughness:.16,metalness:.10,side:THREE.DoubleSide,depthWrite:false}),
  dirt:new THREE.MeshStandardMaterial({color:'#91864a',roughness:1}),
 };
 M.yellow.userData.kind='hazmat';M.blue.userData.kind='glove';
 // Cloth weave and subtle varying roughness supplement modeled centimetre-scale folds.
 M.yellow.onBeforeCompile=s=>{
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float suitGrain=fract(sin(dot(vBumpMapUv*291.,vec2(12.9898,78.233)))*43758.5453);
   diffuseColor.rgb*=.96+suitGrain*.07;
  `);
 };
 M.yellow.customProgramCacheKey=()=> 'jesse-coverall-weave-v1';
 const cube=new THREE.BoxGeometry(1,1,1),unitSphere=new THREE.SphereGeometry(1,24,16);
 function mesh(g,m,name,parent=suit){const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 function box(x,y,z,w,h,d,m=M.seam,parent=hardware,name='Detail'){const o=mesh(cube,m,name,parent);o.position.set(x,y,z);o.scale.set(w,h,d);return o;}
 function ellipsoid(x,y,z,rx,ry,rz,m,parent=hardware,name='Rounded detail'){const o=mesh(unitSphere,m,name,parent);o.position.set(x,y,z);o.scale.set(rx,ry,rz);return o;}
 function cylinder(x,y,z,rt,rb,h,m,parent=hardware,n=32,name='Fitting'){const o=mesh(new THREE.CylinderGeometry(rt,rb,h,n),m,name,parent);o.position.set(x,y,z);return o;}
 function torus(x,y,z,r,t,m,parent=hardware,name='Ring'){const o=mesh(new THREE.TorusGeometry(r,t,8,40),m,name,parent);o.position.set(x,y,z);return o;}
 function tube(points,r,m=M.seam,parent=hardware,name='Seam'){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,Math.max(18,points.length*5),r,8,false),m,name,parent);}
 function line(a,b,r,m=M.metal,parent=hardware){return tube([a,b],r,m,parent,'Molded edge');}
 function ribbon(points,width,m=M.strap,parent=hardware,front=new THREE.Vector3(0,0,1),name='Woven strap'){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),p=[],uv=[],idx=[];const segments=Math.max(24,points.length*8);
  for(let i=0;i<=segments;i++){const t=i/segments,center=curve.getPoint(t),tangent=curve.getTangent(t),cross=new THREE.Vector3().crossVectors(tangent,front).normalize().multiplyScalar(width/2);for(const side of[-1,1]){const v=center.clone().addScaledVector(cross,side);p.push(v.x,v.y,v.z);uv.push(side===1?1:0,t);}}
  for(let i=0;i<segments;i++){let a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const o=mesh(g,m,name,parent);o.material.side=THREE.DoubleSide;return o;
 }
 function profileValue(profile,t,k){const i=Math.min(profile.length-2,Math.max(0,profile.findIndex((p,n)=>n<profile.length-1&&t>=p[0]&&t<=profile[n+1][0])));const a=profile[i],b=profile[i+1];const u=smooth(a[0],b[0],t);return THREE.MathUtils.lerp(a[k],b[k],u);}
 const creaseCache=new Map();
 function wrinkle(theta,t,phase,mode='body'){
  if(!creaseCache.has(phase)){const value=n=>{const a=Math.sin(n*127.1+phase*71.7)*43758.5453;return a-Math.floor(a);};const features=[];for(let i=0;i<32;i++)features.push({a:value(i*7+1)*Math.PI*2,t:.045+value(i*7+2)*.91,w:.012+value(i*7+3)*.019,l:.32+value(i*7+4)*1.0,s:(value(i*7+5)-.5)*.25,h:.002+value(i*7+6)*.005});creaseCache.set(phase,features);}
  let result=Math.sin(theta*5+Math.sin(t*6+phase))*.0018*Math.sin(t*Math.PI);
  for(const c of creaseCache.get(phase)){const da=Math.atan2(Math.sin(theta-c.a),Math.cos(theta-c.a));const dt=t-c.t-c.s*da;const along=Math.exp(-((da/c.l)**2));const crease=Math.exp(-((dt/c.w)**2))-.30*Math.exp(-((dt/(c.w*2.5))**2));result+=crease*along*c.h;}
  const gather=smooth(.85,1,t)*Math.sin(theta*12+t*52)*.002;
  return result+gather;
 }
 const torsoProfile=[[.0,.140,.085],[.12,.226,.154],[.31,.216,.139],[.54,.226,.140],[.75,.245,.145],[.88,.258,.135],[.94,.210,.114],[1,.081,.076]];
 function torsoPoint(t,theta,extra=0){const y=.84+t*.658;const rx=profileValue(torsoProfile,t,1),rz=profileValue(torsoProfile,t,2);const fold=wrinkle(theta,t,1.8);let chest=.006*Math.sin(t*3.3);return new THREE.Vector3(Math.sin(theta)*(rx+fold+extra)-.008*(1-t),y,Math.cos(theta)*(rz+fold+extra)+chest);}
 function gap(t){return smooth(.43,1,t)*.93;}
 // One continuous torso shell with a real open neckline, rather than a painted V.
 {
  const p=[],uv=[],idx=[],rows=132,cols=112;
  for(let i=0;i<=rows;i++){let t=i/rows;for(let j=0;j<=cols;j++){const a=gap(t)+(Math.PI*2-gap(t)*2)*j/cols;const v=torsoPoint(t,a);p.push(v.x,v.y,v.z);uv.push(j/cols,t);}}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*(cols+1)+j,b=a+1,c=a+cols+1;idx.push(a,b,c,b,c+1,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(g,M.yellow,'Coverall torso — open collar');
 }
 function limb(points,radii,phase,name,parent=suit,material=M.yellow,mode='leg'){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),p=[],uv=[],idx=[],rows=100,cols=64;
  for(let i=0;i<=rows;i++){const t=i/rows,c=path.getPoint(t),tan=path.getTangent(t),axisX=new THREE.Vector3().crossVectors(tan,new THREE.Vector3(0,0,1)).normalize(),axisZ=new THREE.Vector3().crossVectors(axisX,tan).normalize();const rx=profileValue(radii,t,1),rz=profileValue(radii,t,2);
   for(let j=0;j<=cols;j++){let theta=j/cols*Math.PI*2;let fold=material===M.yellow?wrinkle(theta,t,phase,mode):Math.sin(theta*5+t*40)*.0005;let v=c.clone().addScaledVector(axisX,Math.sin(theta)*(rx+fold)).addScaledVector(axisZ,Math.cos(theta)*(rz+fold));p.push(v.x,v.y,v.z);uv.push(j/cols,t);}}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*(cols+1)+j,b=a+1,c=a+cols+1;idx.push(a,b,c,b,c+1,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(g,material,name,parent);
  return path;
 }
 // Slightly offset stance, with relaxed arms and asymmetric knee folds.
 {
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(typed(JESSE_SUIT_DATA.position,Float32Array),3));g.setAttribute('normal',new THREE.BufferAttribute(typed(JESSE_SUIT_DATA.normal,Float32Array),3));g.setAttribute('uv',new THREE.BufferAttribute(typed(JESSE_SUIT_DATA.uv,Float32Array),2));g.setIndex(new THREE.BufferAttribute(typed(JESSE_SUIT_DATA.index,Uint32Array),1));g.computeBoundingSphere();mesh(g,M.yellow,'Continuous sculpted protective trousers');
 }
 for(const side of[-1,1]){
  const phase=side===1?1.2:3.3;
  limb([[side*.16,1.358,-.01],[side*.235,1.385,-.005],[side*.286,1.278,-.006],[side*.321,1.124,side===1?.01:-.01],[side*.345,.973,.052],[side*.344,.855,side===1?.095:.061]],[[0,.072,.080],[.14,.093,.096],[.32,.091,.093],[.55,.078,.081],[.79,.066,.068],[1,.044,.047]],phase+4,side===1?'Right sleeve':'Left sleeve',suit,M.yellow,'arm');
  // Outer leg seam follows the slightly bent leg; the fine adjacent line is stitching.
  const legSeam=[[side*.225,.89,.004],[side*.243,.70,.009],[side*.250,.53,.035],[side*.257,.32,.02],[side*.252,.165,.025]];
  tube(legSeam,.0018,M.seam);tube(legSeam.map(([x,y,z])=>[x+side*.004,y,z]),.00065,M.thread);
  const armSeam=[[side*.284,1.425,.05],[side*.359,1.285,.032],[side*.409,1.126,.026],[side*.412,.977,.049],[side*.389,.863,.09]];
  tube(armSeam,.0015,M.seam);tube(armSeam.map(([x,y,z])=>[x,y,z+.004]),.00055,M.thread);
  // Elastic cuffs with compressed fabric ridges.
  for(let i=0;i<5;i++){const c=torus(side*.344,.859+i*.005,side===1?.095:.061,.044,.0017,M.seam);c.rotation.x=Math.PI/2;}
 }
 // Closed lower zip and diverging pale zipper tapes in the opened chest.
 const zipBase=[];for(let i=0;i<=32;i++){const t=.028+i/32*.412;const p=torsoPoint(t,0,.002);zipBase.push(p.toArray());}
 ribbon(zipBase,.012,M.lining,hardware,new THREE.Vector3(0,0,1),'Closed zipper tape');
 for(let i=0;i<71;i++){let t=.04+i*.0057;const p=torsoPoint(t,0,.005);box(p.x,p.y,p.z,.009,.0018,.0022,M.metal,hardware,'Zipper tooth');}
 for(const side of[-1,1]){
  const edge=[];for(let i=0;i<=60;i++){let t=.435+i/60*.565;edge.push(torsoPoint(t,side>0?gap(t):Math.PI*2-gap(t),.0025).toArray());}
  ribbon(edge,.013,M.lining,hardware,new THREE.Vector3(0,0,1),'Open zipper tape');tube(edge,.00135,M.thread);
  for(let i=0;i<36;i++){let t=.452+i/35*.52,p=torsoPoint(t,side>0?gap(t):Math.PI*2-gap(t),.0045);box(p.x,p.y,p.z,.003,.0021,.002,M.metal,hardware,'Open zipper tooth');}
 }
 const zipY=torsoPoint(.438,0,.01);box(zipY.x,zipY.y,zipY.z,.012,.017,.006,M.metal,hardware,'Zipper slider');const pull=torus(zipY.x,zipY.y-.012,zipY.z+.005,.007,.0012,M.metal);pull.scale.x=.55;
 // Olive-grey shirt and rolled rib-knit collar under the open suit.
 {
  const p=[],uv=[],idx=[],rows=32,cols=80;
  for(let i=0;i<=rows;i++){let t=i/rows;for(let j=0;j<=cols;j++){let a=j/cols*Math.PI*2,top=1.448-.047*Math.max(0,Math.cos(a))**2,y=1.09+(top-1.09)*t,rx=.18*(1-t)+.071*t,rz=.125*(1-t)+.081*t;p.push(Math.sin(a)*rx,y,Math.cos(a)*rz+.008);uv.push(j/cols,t);}}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*(cols+1)+j,c=a+cols+1;idx.push(a,a+1,c,a+1,c+1,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(g,M.shirt,'Olive undershirt');
  const collar=[];for(let j=0;j<=70;j++){const a=j/70*Math.PI*2;collar.push([Math.sin(a)*.072,1.448-.047*Math.max(0,Math.cos(a))**2,Math.cos(a)*.082+.008]);}tube(collar,.003,M.shirt);
 }
 // Collapsed hood: crumpled outer fabric around the nape, pale inner lining.
 for(const inner of[false,true]){
  const p=[],uv=[],idx=[],rows=44,cols=90;
  for(let i=0;i<=rows;i++){const t=i/rows;for(let j=0;j<=cols;j++){const a=.82+j/cols*(Math.PI*2-1.64),r=.079+t*.087;const fold=Math.sin(a*14+t*19)*.008+Math.sin(a*27-t*24)*.004;
   const y=1.465-t*.066+Math.sin(Math.PI*t)*.030+fold*.55+(inner?.002:0);p.push(Math.sin(a)*(r+fold*.55),y,Math.cos(a)*(r+fold*.55)-.018);uv.push(j/cols,t);}}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*(cols+1)+j,c=a+cols+1;if(inner&&i>rows*.47)continue;idx.push(a,a+1,c,a+1,c+1,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(g,inner?M.lining:M.yellow,inner?'Hood lining':'Gathered hood');
 }
 // Hands have individual curved fingers, knuckles, thumb webs and glove creases.
 function hand(side){const g=new THREE.Group();g.name=side===1?'Right hand':'Left hand';g.position.set(side*.344,.858,side===1?.095:.061);g.rotation.z=side*.09;gloves.add(g);
  ellipsoid(0,-.049,0,.036,.059,.023,M.blue,g,'Gloved palm');ellipsoid(0,-.008,0,.037,.024,.028,M.blue,g,'Wrist');
  for(let i=0;i<4;i++){let x=(i-1.5)*.017,ln=[.060,.071,.067,.052][i];
   const pts=[[x,-.081,.002],[x,-.096-ln*.30,.013],[x,-.087-ln*.74,.025],[x,-.082-ln,.020]];
   const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const o=mesh(new THREE.TubeGeometry(curve,24,.0081-i*.00045,10,false),M.blue,'Curved finger',g);
   ellipsoid(x,-.081-ln,.020,.0079-i*.0004,.008,.0075,M.blue,g,'Finger tip');
   for(const t of[.32,.70]){const c=curve.getPoint(t);tube([[c.x-.006,c.y,c.z+.006],[c.x,c.y-.001,c.z+.008],[c.x+.006,c.y,c.z+.006]],.00055,M.blueDark,g,'Glove flexion crease');}
  }
  const thumbSide=-side;ellipsoid(thumbSide*.029,-.043,.017,.016,.025,.018,M.blue,g,'Thumb web');
  tube([[thumbSide*.031,-.04,.011],[thumbSide*.047,-.059,.023],[thumbSide*.044,-.081,.032],[thumbSide*.034,-.095,.034]],.010,M.blue,g,'Thumb');ellipsoid(thumbSide*.034,-.095,.034,.009,.010,.009,M.blue,g,'Thumb tip');
  for(let j=0;j<4;j++)tube([[-.029,-.031-j*.01,.018],[-.006,-.033-j*.01,.022],[.027,-.03-j*.01,.018]],.0005,M.blueDark,g,'Palm creases');
 }
 hand(-1);hand(1);
 // Rounded protective boots, gathered ankles, bonded sole and tread blocks.
 function boot(side){const g=new THREE.Group();g.name=side===1?'Right protective boot':'Left protective boot';g.position.set(side*.177,0,.025);g.rotation.y=side*.11;boots.add(g);
  const profile=[[0,.087,.137,.039],[.018,.091,.143,.041],[.055,.088,.137,.044],[.105,.082,.116,.03],[.145,.075,.089,.008],[.205,.071,.076,0]],p=[],uv=[],idx=[],rows=54,cols=80;
  for(let i=0;i<=rows;i++){let t=i/rows,y=.012+t*.193;const rx=profileValue(profile,y,1),rz=profileValue(profile,y,2),shift=profileValue(profile,y,3);for(let j=0;j<=cols;j++){const a=j/cols*Math.PI*2;const crease=smooth(.095,.19,y)*Math.sin(y*290+a*3)*.0025;const v=new THREE.Vector3(Math.sin(a)*(rx+crease),y,Math.cos(a)*(rz+crease)+shift);p.push(v.x,v.y,v.z);uv.push(j/cols,t);}}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*(cols+1)+j,c=a+cols+1;idx.push(a,a+1,c,a+1,c+1,c);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,M.yellow,'Boot cover',g);
  const sole=[];for(let j=0;j<=70;j++){const a=j/70*6.283185;sole.push([Math.sin(a)*.087,.017,Math.cos(a)*.139+.04]);}tube(sole,.006,M.rubber,g,'Sole welt');
  for(let k=0;k<12;k++)box(0,.008,-.077+k*.020,.15-Math.abs(k-5)*.004,.014,.011,M.rubber,g,'Sole tread');
  tube([[0,.19,.082],[0,.145,.099],[0,.104,.146],[0,.057,.181]],.0016,M.seam,g,'Boot seam');
  for(let i=0;i<16;i++){const a=random()*6.28;const y=.026+random()*.035;const dirt=box(Math.sin(a)*.087,y,Math.cos(a)*.137+.04,.004+random()*.007,.0015,.002,M.dirt,g,'Dust fleck');dirt.rotation.y=a;}
 }
 boot(-1);boot(1);
 // Original textured head and hair, without scalp deformation or recoloring.
 function typed(encoded,Type){const s=atob(encoded),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return new Type(b.buffer);}
 const headGeo=new THREE.BufferGeometry();
 headGeo.setAttribute('position',new THREE.BufferAttribute(typed(JESSE_HEAD_DATA.position,Float32Array),3));
 headGeo.setAttribute('normal',new THREE.BufferAttribute(typed(JESSE_HEAD_DATA.normal,Float32Array),3));
 headGeo.setAttribute('uv',new THREE.BufferAttribute(typed(JESSE_HEAD_DATA.uv,Float32Array),2));
 headGeo.setIndex(new THREE.BufferAttribute(typed(JESSE_HEAD_DATA.index,Uint32Array),1));headGeo.computeBoundingSphere();
 let textureResolve,textureReject;const ready=new Promise((resolve,reject)=>{textureResolve=resolve;textureReject=reject;});
 const faceTex=new THREE.TextureLoader().load(JESSE_HEAD_DATA.texture,()=>textureResolve(),undefined,()=>textureReject(new Error('Nie udało się wczytać tekstury twarzy Jessego.')));faceTex.colorSpace=THREE.SRGBColorSpace;faceTex.anisotropy=8;
 const faceMaterial=new THREE.MeshStandardMaterial({map:faceTex,color:'#ffffff',roughness:.76});
 faceMaterial.userData={kind:'jesse-skin',textureSource:'supplied ko6i bust'};
 const head=mesh(headGeo,faceMaterial,'Supplied ko6i original head and hair',root);head.position.set(0,1.505,0);head.rotation.z=.022;head.rotation.y=-.025;
 // Static batching retains separate materials and the original textured head.
 function batch(group){group.updateMatrixWorld(true);const bins=new Map(),original=[];group.traverse(o=>{if(!o.isMesh)return;original.push(o);if(!bins.has(o.material.uuid))bins.set(o.material.uuid,{m:o.material,geos:[]});let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert().multiply(o.matrixWorld));bins.get(o.material.uuid).geos.push(g);});original.forEach(o=>o.removeFromParent());
  for(const {m,geos}of bins.values()){const geo=new THREE.BufferGeometry();for(const name of['position','normal','uv']){const n=name==='uv'?2:3,len=geos.reduce((s,g)=>s+g.attributes.position.count*n,0),data=new Float32Array(len);let offset=0;for(const g of geos){const attr=g.getAttribute(name);if(attr)data.set(attr.array,offset);offset+=g.attributes.position.count*n;}geo.setAttribute(name,new THREE.BufferAttribute(data,n));}geo.computeBoundingSphere();mesh(geo,m,'Batched '+(group.name||'detail'),group);geos.forEach(g=>g.dispose());}
 }
 [suit,hardware,boots,gloves].forEach(batch);
 for(const group of[suit,hardware,boots,gloves])group.scale.x=.84;
 const anchor=rv.world(2.95,0,3.05);root.position.set(anchor.x,height(anchor.x,anchor.z),anchor.z);root.rotation.y=.56;scene.add(root);root.updateMatrixWorld(true);
 let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 const stats={meshes,triangles,headTriangles:JESSE_HEAD_DATA.triangles,height:new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y,animated:false};
 return {root,head,ready,stats};
}
