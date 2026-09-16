import { createInventory } from './inventory.js';
import { createCrystalGame } from './crystal-game.js';
import { createFirstPersonHands } from './fp-hands.js';
import * as THREE from './vendor/three.module.js';
import { createRV } from './rv.js';
import { createJesse } from './jesse.js';

const $=s=>document.querySelector(s), canvas=$('#world');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('#loadtext').textContent='Mapa wymaga przeglądarki z włączoną obsługą WebGL 2.';throw e;}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#b8c5c9',.00115);
const camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.035,2200);camera.rotation.order='YXZ';
const hemi=new THREE.HemisphereLight('#bfd7ee','#79533c',2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0d5',3.6);sun.position.set(-130,210,95);sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-240,right:240,top:210,bottom:-210,near:1,far:700});sun.shadow.bias=-.00012;sun.shadow.normalBias=.2;sun.target.position.set(0,0,-45);scene.add(sun,sun.target);
const driveObstacles=[];let seed=1217;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}function rand(a,b){return a+(b-a)*rnd();}
const clamp=THREE.MathUtils.clamp, mix=THREE.MathUtils.lerp;
function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y){const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v);}
function fbm(x,y){return noise(x,y)*.56+noise(x*2.07,y*2.07)*.27+noise(x*4.3,y*4.3)*.12+noise(x*8.1,y*8.1)*.05;}
function smooth(a,b,x){let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function edgeX(x){return -125+18*Math.sin(x*.011)+11*Math.sin(x*.037)+5*Math.sin(x*.092);}
function naturalHeight(x,z){
 let base=(fbm(x*.023,z*.023)-.5)*4.2+(noise(x*.11,z*.11)-.5)*.28;
 const d=edgeX(x)-z, top=58+noise(x*.028,9)*12;
 base+=smooth(-85,-2,d)*(19+noise(x*.06,z*.06)*5)+smooth(-2,5,d)*top;
 const right=x-(178+Math.sin(z*.025)*18);base+=smooth(-70,0,right)*20+smooth(0,7,right)*(48+noise(z*.04,18)*12);
 const butte=Math.sqrt(((x+118)/1.03)**2+((z+4)/.84)**2);
 base+=(1-smooth(30,65,butte))*16+(1-smooth(25,31,butte))*(38+noise(x*.12,z*.07)*7);
 base+=smooth(340,470,Math.hypot(x,z))*((fbm(x*.012,z*.012))*45);
 return base;
}
const parkingHeight=naturalHeight(25,76);
function height(x,z){const dx=x-25,dz=z-76;const lx=dx*Math.cos(.2)+dz*Math.sin(.2),lz=-dx*Math.sin(.2)+dz*Math.cos(.2);const dist=Math.max(Math.abs(lx)-5.6,Math.abs(lz)-2.6);return mix(parkingHeight,naturalHeight(x,z),smooth(0,4,dist));}
function inParking(x,z){return Math.hypot(x-25,z-76)<7;}
// Surface color is evaluated in world space so neighboring pieces share sediment layers.
const noiseGLSL=`
float h3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float f3(vec3 p){return .55*n3(p)+.27*n3(p*2.03)+.12*n3(p*4.07)+.06*n3(p*8.17);}
`;
function earthMaterial(rock=false){let m=new THREE.MeshStandardMaterial({color:rock?'#b78365':'#c2a082',roughness:1});m.onBeforeCompile=s=>{
 s.vertexShader='varying vec3 vWorld;\n'+s.vertexShader;
 s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 terrainWorld=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 terrainWorld=instanceMatrix*terrainWorld;
 #endif
 vWorld=(modelMatrix*terrainWorld).xyz;`);
 s.fragmentShader='varying vec3 vWorld;\n'+noiseGLSL+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float coarse=f3(vWorld*.21);float grain=n3(vWorld*18.);float fleck=n3(vWorld*3.7);
 float layerY=vWorld.y+n3(vec3(vWorld.x*.075,0.,vWorld.z*.075))*.55;
 float band=sin(layerY*5.6)*.045+sin(layerY*1.7)*.065;
 float seam=pow(.5+.5*sin(layerY*10.5),20.)*.09;
 float strata=n3(vec3(vWorld.x*.045,layerY*2.,vWorld.z*.045));
 float cliff=${rock?'1.':'smoothstep(9.,32.,vWorld.y)'};
 vec3 sand=mix(vec3(.51,.355,.235),vec3(.76,.58,.40),coarse);
 vec3 stone=mix(vec3(.34,.17,.10),vec3(.65,.39,.23),coarse*.8+strata*.2);
 stone*=.94+band-seam;
 diffuseColor.rgb=mix(sand,stone,cliff)*( .87+grain*.16+fleck*.13);
 `);};m.customProgramCacheKey=()=>rock?'rock-strata':'soil-strata';return m;}
const groundMat=earthMaterial(),rockMat=earthMaterial(true);
// Dense height field: continuous walkable floor, talus and steep mesa faces.
const terrainGeo=new THREE.PlaneGeometry(1200,1200,600,600);terrainGeo.rotateX(-Math.PI/2);
const tp=terrainGeo.attributes.position;for(let i=0;i<tp.count;i++)tp.setY(i,height(tp.getX(i),tp.getZ(i)));terrainGeo.computeVertexNormals();
const terrain=new THREE.Mesh(terrainGeo,groundMat);terrain.receiveShadow=true;scene.add(terrain);
// Rounded, weathered blocks with subdivided fractured surfaces.
const rockGeos=[];for(let j=0;j<7;j++){const g=new THREE.IcosahedronGeometry(1,2);const p=g.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);let k=.84+fbm(x*3+j*5,z*3+y*2)*.29; p.setXYZ(i,x*k,y*k*(.92+.08*Math.sin(y*17+j)),z*k);}g.computeVertexNormals();rockGeos.push(g);}
const dummy=new THREE.Object3D();const tint=new THREE.Color();let rockCount=0;
function rocks(count,position,scale){const groups=Array.from({length:7},()=>[]);for(let i=0;i<count;i++){const p=position(i);if(!p||inParking(p.x,p.z))continue;groups[i%7].push({...p,s:scale(p)});}groups.forEach((items,j)=>{if(!items.length)return;const inst=new THREE.InstancedMesh(rockGeos[j],rockMat,items.length);items.forEach((p,i)=>{dummy.position.set(p.x,height(p.x,p.z)+p.s*.28,p.z);dummy.rotation.set(rand(-.3,.3),rand(0,6.28),rand(-.3,.3));dummy.scale.set(p.s*rand(.9,1.5),p.s*rand(.55,.95),p.s*rand(.7,1.2));dummy.updateMatrix();if(p.s>.6)driveObstacles.push({x:p.x,z:p.z,r:p.s*.65});inst.setMatrixAt(i,dummy.matrix);});inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);rockCount+=items.length;});}
rocks(2600,()=>{let x=rand(-350,330),z=rand(-220,280);if(height(x,z)>76)return null;return{x,z}},()=>rand(.12,.65));
rocks(2300,()=>{let x=rand(-310,220),z=edgeX(x)+rand(8,87);return{x,z}},()=>Math.pow(rnd(),2)*3.9+.25);
rocks(1100,()=>{let z=rand(-180,240),x=rand(112,192);return{x,z}},()=>rand(.4,3.2));
rocks(400,()=>{let a=rand(0,6.28),d=rand(33,75);return{x:-118+Math.cos(a)*d,z:-4+Math.sin(a)*d*.84}},()=>rand(.4,2.4));
rocks(16,i=>({x:[-28,-23,39,80,-47,72,-70,102,14,65,92,-61,-95,135,50,-35][i],z:[62,59,23,61,15,-30,77,4,108,135,80,-48,120,58,8,-8][i]}),()=>rand(2,5));
// Individual buttresses articulate the cliff silhouette and deep vertical fissures.
for(let i=0;i<68;i++){
 const x=-280+i*7.2,z=edgeX(x)-5;
 const g=new THREE.CylinderGeometry(rand(3.6,5.6),rand(5,7),rand(38,55),8,28);
 const p=g.attributes.position;for(let k=0;k<p.count;k++){const y=p.getY(k);let r=1+.035*Math.sin(y*1.9)+.026*Math.sin(y*4.7)+noise(y*.8,i)*.035;p.setX(k,p.getX(k)*r);p.setZ(k,p.getZ(k)*r);}g.computeVertexNormals();
 const b=new THREE.Mesh(g,rockMat);b.position.set(x,52+noise(i,8)*5,z+3);b.rotation.y=rand(0,.35);b.castShadow=true;b.receiveShadow=true;scene.add(b);
}
// Dry grass uses real blade geometry, not opaque billboards.
let grassPos=[],grassCol=[];const grassColors=[new THREE.Color('#9b8750'),new THREE.Color('#b2a16c'),new THREE.Color('#80774c')];
for(let i=0;i<16000;i++){
 const x=rand(-285,280),z=rand(-150,310),y=height(x,z);if(inParking(x,z)||y>35||Math.abs(x-18-Math.sin(z*.019)*18)<12&&z>0||rnd()<.2)continue;
 const c=grassColors[i%3],scale=rand(.35,.85);
 for(let k=0;k<5;k++){let a=rand(0,6.28),dx=Math.cos(a),dz=Math.sin(a),w=rand(.018,.038),h=scale*rand(.6,1.3),lean=rand(.12,.36);let bx=x+rand(-.12,.12),bz=z+rand(-.12,.12);
 grassPos.push(bx-dz*w,y,bz+dx*w,bx+dz*w,y,bz-dx*w,bx+dx*lean,y+h,bz+dz*lean);
 grassCol.push(c.r*.7,c.g*.7,c.b*.7,c.r*.7,c.g*.7,c.b*.7,c.r,c.g,c.b);}
}
const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(grassPos,3));gg.setAttribute('color',new THREE.Float32BufferAttribute(grassCol,3));gg.computeVertexNormals();
const grass=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));grass.receiveShadow=true;scene.add(grass);
// Sparse juniper and sage: branching wood and thousands of small leaf clusters.
const leaves=[],branches=[];const bushCenters=[];
for(let i=0;i<740;i++){
 let x=rand(-260,260),z=rand(-140,290),y=height(x,z);if(inParking(x,z)||y>43||Math.abs(x-18-Math.sin(z*.019)*18)<19&&z>0)continue;
 let size=rand(.35,1.25);if(i%9===0)size=rand(1.6,2.6);bushCenters.push({x,z,r:size*.65});
 for(let k=0;k<10;k++){
 let a=rand(0,6.28),length=size*rand(.4,1.1),end=new THREE.Vector3(x+Math.cos(a)*length*.7,y+length,z+Math.sin(a)*length*.7);
 branches.push({start:new THREE.Vector3(x,y,z),end,r:size*.025});
 for(let j=0;j<10;j++){let u=rand(0,6.28),v=rand(-1,1),r=size*rand(.1,.48),dx=Math.cos(u)*Math.sqrt(1-v*v),dz=Math.sin(u)*Math.sqrt(1-v*v);leaves.push({x:end.x+dx*r,y:end.y+v*r*.7,z:end.z+dz*r,s:size*rand(.08,.18),sage:size<1.2});}
 }
}
const leafGeo=new THREE.IcosahedronGeometry(1,0),leafMat=new THREE.MeshStandardMaterial({color:'#fff',roughness:1});
const leafMesh=new THREE.InstancedMesh(leafGeo,leafMat,leaves.length);
leaves.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(rnd()*3,rnd()*3,rnd()*3);dummy.scale.set(p.s*1.4,p.s*.7,p.s);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);tint.set(p.sage?'#72785a':'#424d28');tint.multiplyScalar(rand(.65,1.3));leafMesh.setColorAt(i,tint);});leafMesh.castShadow=true;leafMesh.receiveShadow=true;scene.add(leafMesh);
const twig=new THREE.InstancedMesh(new THREE.CylinderGeometry(.5,1,1,4),new THREE.MeshStandardMaterial({color:'#66523b',roughness:1}),branches.length),up=new THREE.Vector3(0,1,0);
branches.forEach((p,i)=>{let d=p.end.clone().sub(p.start);dummy.position.copy(p.start).addScaledVector(d,.5);dummy.quaternion.setFromUnitVectors(up,d.clone().normalize());dummy.scale.set(p.r,d.length(),p.r);dummy.updateMatrix();twig.setMatrixAt(i,dummy.matrix)});scene.add(twig);
// A blue atmospheric dome with layered procedural cloud banks and a soft sun halo.
const skyUniforms={sunDir:{value:sun.position.clone().normalize()},warm:{value:0}};
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vSky;uniform vec3 sunDir;uniform float warm;${noiseGLSL}
 void main(){vec3 d=normalize(vSky);float h=max(d.y,0.);vec3 horizon=mix(vec3(.71,.79,.83),vec3(.82,.64,.45),warm);vec3 zenith=mix(vec3(.20,.40,.66),vec3(.26,.38,.54),warm);vec3 c=mix(horizon,zenith,pow(h,.43));float s=max(dot(d,sunDir),0.);c+=vec3(1.,.81,.53)*pow(s,65.)*.3;c+=vec3(1.,.93,.73)*pow(s,1700.)*2.;vec3 q=d/(max(d.y,.10))*2.9;float clouds=f3(vec3(q.x,1.7,q.z));float mask=smoothstep(.53,.70,clouds)*smoothstep(.01,.17,d.y);vec3 cc=mix(vec3(.68,.71,.75),vec3(1.,.98,.92),smoothstep(.5,.75,clouds));c=mix(c,cc,mask*.88);gl_FragColor=vec4(c,1.);}`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(1400,48,24),skyMat);scene.add(sky);
// A soft environment reflection reveals brushed metal, glass rims and chrome.
if(renderer.isWebGLRenderer){const envScene=new THREE.Scene();envScene.add(new THREE.Mesh(new THREE.SphereGeometry(20,24,12),new THREE.MeshBasicMaterial({color:'#9caeaf',side:THREE.BackSide})));const lightCard=new THREE.Mesh(new THREE.PlaneGeometry(15,10),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2.8,2.4),side:THREE.DoubleSide}));lightCard.position.set(-6,10,7);lightCard.lookAt(0,0,0);envScene.add(lightCard);const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.06).texture;scene.environmentIntensity=.65;pmrem.dispose();envScene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
const rv=createRV({scene,height});
const jesse=createJesse({scene,rv,height});
const hands=createFirstPersonHands({scene,camera,rv});
const doorRaycaster=new THREE.Raycaster();doorRaycaster.far=1.6;
const doorViewDirection=new THREE.Vector3();
function canInteractWithDoor(){
 if(rv.cutaway||camera.position.distanceTo(rv.world(1.51,1.75,1.4))>2.8)return false;
 rv.door.updateWorldMatrix(true,true);
 camera.rotation.set(pitch,yaw,0,'YXZ');
 camera.getWorldDirection(doorViewDirection);
 doorRaycaster.set(camera.position,doorViewDirection);
 if(!doorRaycaster.intersectObject(rv.door,true).length)return false;
 rv.root.updateMatrixWorld(true);
 const hit=doorRaycaster.intersectObject(rv.root,true).find(({object})=>{
  for(let p=object;p;p=p.parent)if(!p.visible)return false;
  return true;
 });
 if(!hit)return false;
 for(let p=hit.object;p;p=p.parent)if(p===rv.door)return true;
 return false;
}
// A dedicated shadow map follows the RV at centimetre scale for window blinds,
// cabinet edges and the contact of its tires with the ground.
const rvSun=new THREE.DirectionalLight('#fff0d5',1.9);rvSun.castShadow=true;rvSun.shadow.mapSize.set(2048,2048);Object.assign(rvSun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.2,far:65});rvSun.shadow.bias=-.0001;rvSun.shadow.normalBias=.007;rvSun.target.position.copy(rv.world(0,1,0));rvSun.position.copy(rvSun.target.position).add(sun.position.clone().normalize().multiplyScalar(30));scene.add(rvSun,rvSun.target);
sun.intensity=1.7;
// Navigation is terrain-following and rejects steep slopes instead of climbing cliffs.
const keys=new Set();let yaw=0,pitch=0,walking=false,drag=false,lastX=0,lastY=0,hideUI=false;let last=performance.now(),elapsed=0;
let paused=true,requestingLock=false;
const inventory=createInventory({rv,camera,hands,notice,clearMovement:()=>keys.clear(),onClose:()=>{if(!paused)resumeGame();}});
// Fixed clearing: follows terrain, never follows the moving RV.
const cookingZone={x:25,z:76,radius:18};
function inCookingZone(){
 const c=Math.cos(rv.root.rotation.y),s=Math.sin(rv.root.rotation.y);
 for(const x of [-4.8,4.8])for(const z of [-1.3,1.3]){
  const dx=rv.root.position.x+x*c+z*s-cookingZone.x,dz=rv.root.position.z-x*s+z*c-cookingZone.z;
  if(dx*dx+dz*dz>cookingZone.radius*cookingZone.radius)return false;
 }
 return true;
}
const cookingZoneVisual=new THREE.Group();cookingZoneVisual.name='Cooking parking area';scene.add(cookingZoneVisual);
const zoneGeo=new THREE.RingGeometry(0,18,128,24);zoneGeo.rotateX(-Math.PI/2);
const zonePoints=zoneGeo.attributes.position;
for(let i=0;i<zonePoints.count;i++){const x=zonePoints.getX(i)+25,z=zonePoints.getZ(i)+76;zonePoints.setXYZ(i,x,height(x,z)+.045,z);}
zoneGeo.computeBoundingSphere();
const zoneMat=new THREE.MeshBasicMaterial({color:'#47ed79',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
cookingZoneVisual.add(new THREE.Mesh(zoneGeo,zoneMat));
const edgePoints=[];for(let i=0;i<128;i++){const a=i/128*Math.PI*2,x=25+18*Math.cos(a),z=76+18*Math.sin(a);edgePoints.push(new THREE.Vector3(x,height(x,z)+.065,z));}
const zoneEdgeMat=new THREE.LineBasicMaterial({color:'#47ed79',transparent:true,opacity:.95,depthWrite:false});
cookingZoneVisual.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edgePoints),zoneEdgeMat));
cookingZoneVisual.visible=false;
function updateCookingZone(){cookingZoneVisual.visible=driving&&!paused;const color=inCookingZone()?'#47ed79':'#ef4545';zoneMat.color.set(color);zoneEdgeMat.color.set(color);}
const crystal=createCrystalGame({rv,camera,hands,canCook:inCookingZone,onCookingBlocked:()=>notice('Gotowanie zablokowane. Zaparkuj cały RV w strefie przy początkowym parkingu.'),onBatch:(id,purity)=>inventory.queueBatch(id,purity),canStartBatch:()=>{if(inventory.pending){notice('Poczekaj na zakończenie animacji odbioru partii.');return false;}return true;},clearMovement:()=>{keys.clear();drag=false;},onClose:()=>{if(!paused)resumeGame();}});
let driving=false,driveSpeed=0,driveTurn=0;
const steeringRay=new THREE.Raycaster();
function canDrive(){
 if(driving||paused||crystal.active||inventory.active||inventory.busy||hands.busy||rv.cutaway||!rv.isInside(camera.position))return false;
 rv.steering.updateWorldMatrix(true,true);steeringRay.far=1.8;steeringRay.set(camera.position,camera.getWorldDirection(new THREE.Vector3()));
 if(!steeringRay.intersectObject(rv.steering,true).length)return false;rv.root.updateMatrixWorld(true);
 const hit=steeringRay.intersectObject(rv.root,true).find(h=>{for(let p=h.object;p;p=p.parent)if(!p.visible)return false;return true;});
 if(!hit||hit.distance>1.8)return false;for(let p=hit.object;p;p=p.parent)if(p===rv.steering)return true;return false;
}
function startDriving(){
 if(!canDrive())return false;keys.clear();hands.cancel();driving=true;driveSpeed=0;
 if(rv.opened)rv.toggleDoor();camera.position.copy(rv.world(2.64,2.23,-.69));camera.lookAt(rv.world(5,2.05,-.69));yaw=camera.rotation.y;pitch=camera.rotation.x;
 notice('W/S · gaz / hamowanie i cofanie   A/D · skręt   Spacja · hamulec   F · wstań po zatrzymaniu');return true;
}
function stopDriving(){
 if(Math.abs(driveSpeed)>.15){notice('Zatrzymaj RV, aby wstać z fotela.');return false;}
 driving=false;keys.clear();hands.cancel();camera.position.copy(rv.world(2.15,2.53,0));return true;
}
function tickDriving(dt){
 if(!driving||dt===0)return;
 const throttle=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),turn=(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0);
 driveTurn=THREE.MathUtils.damp(driveTurn,turn*.48,5,dt);
 if(keys.has('Space'))driveSpeed=THREE.MathUtils.damp(driveSpeed,0,7,dt);
 else if(throttle)driveSpeed=clamp(driveSpeed+throttle*(driveSpeed*throttle<0?7:2.8)*dt,-3,10);
 else driveSpeed=THREE.MathUtils.damp(driveSpeed,0,.65,dt);
 const da=driveSpeed*Math.tan(driveTurn)/5.3*dt,angle=rv.root.rotation.y+da;
 const nx=rv.root.position.x+Math.cos(angle)*driveSpeed*dt,nz=rv.root.position.z-Math.sin(angle)*driveSpeed*dt;
 const c=Math.cos(angle),sn=Math.sin(angle),ys=[];
 for(const x of [-4,0,4])for(const z of [-1.2,1.2])ys.push(height(nx+x*c+z*sn,nz-x*sn+z*c));
 const nearRock=driveObstacles.some(o=>{const dx=o.x-nx,dz=o.z-nz;return Math.abs(dx*c-dz*sn)<4.8+o.r&&Math.abs(dx*sn+dz*c)<1.35+o.r;});
 const j=jesse.root?.position,nearJesse=j&&Math.abs((j.x-nx)*c-(j.z-nz)*sn)<5.1&&Math.abs((j.x-nx)*sn+(j.z-nz)*c)<1.65;
 if(nx> -285&&nx<140&&nz> -95&&nz<315&&Math.max(...ys)-Math.min(...ys)<1.65&&!nearRock&&!nearJesse){rv.root.position.set(nx,ys.reduce((a,b)=>a+b)/ys.length,nz);rv.root.rotation.y=angle;yaw+=da;}else driveSpeed=0;
 rv.root.updateMatrixWorld(true);rv.steering.quaternion.setFromEuler(new THREE.Euler(0,0,-.60)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-driveTurn*2.8));
 camera.position.copy(rv.world(2.64,2.23,-.69));camera.rotation.set(pitch,yaw,0,'YXZ');
 rvSun.target.position.copy(rv.world(0,1,0));rvSun.position.copy(rvSun.target.position).add(sun.position.clone().normalize().multiplyScalar(30));
}
function aim(position,target){driving=false;driveSpeed=0;inventory.close(false);crystal.close();hands.cancel();camera.position.copy(position);camera.lookAt(target);yaw=camera.rotation.y;pitch=camera.rotation.x;keys.clear();}
function reset(){if(rv.cutaway)rv.toggleCutaway();aim(rv.exterior(),rv.world(0,1.65,0));}
reset();
function notice(t){$('#notice').textContent=t;$('#notice').style.display='block';clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('#notice').style.display='none',4500);}
function showPause(){
 paused=true;keys.clear();drag=false;inventory.close(false);crystal.close();
 $('#pause-menu').hidden=false;$('#pause-main').hidden=false;$('#pause-settings').hidden=true;
 document.body.classList.add('game-paused');$('#crosshair').hidden=true;
 if(document.pointerLockElement)document.exitPointerLock();$('#resume-game').focus?.();
}
function resumeGame(){
 if(requestingLock)return;
 if(!canvas.requestPointerLock){$('#pause-message').textContent='Ta przeglądarka nie obsługuje przechwytywania myszy. Otwórz grę w Chrome lub Edge.';return;}
 requestingLock=true;
 try{const request=canvas.requestPointerLock();request?.catch(()=>{showPause();$('#pause-message').textContent='Kliknij ponownie „Wznów grę”, aby przejąć sterowanie myszą.';}).finally(()=>requestingLock=false);if(!request)requestingLock=false;}
 catch{requestingLock=false;showPause();}
}
$('#resume-game').onclick=resumeGame;
$('#open-settings').onclick=()=>{$('#pause-main').hidden=true;$('#pause-settings').hidden=false;$('#quality').focus?.();};
$('#back-settings').onclick=()=>{$('#pause-main').hidden=false;$('#pause-settings').hidden=true;$('#open-settings').focus?.();};
document.addEventListener('pointerlockchange',()=>{
 requestingLock=false;
 if(document.pointerLockElement===canvas){if(crystal.active||inventory.active){document.exitPointerLock();return;}paused=false;walking=true;keys.clear();$('#pause-menu').hidden=true;document.body.classList.remove('game-paused');$('#crosshair').hidden=false;}
 else if(!crystal.active&&!inventory.active)showPause();
});
document.addEventListener('pointerlockerror',()=>{requestingLock=false;showPause();$('#pause-message').textContent='Kliknij „Wznów grę”, aby uruchomić rozglądanie myszą.';});
document.addEventListener('mousemove',e=>{if(paused||crystal.active||inventory.active||inventory.busy||document.pointerLockElement!==canvas)return;yaw-=e.movementX*.0018;pitch=clamp(pitch-e.movementY*.0018,-1.35,1.35);});
document.addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat)showPause();return;}
 if(paused)return;if(driving){if(e.code==='KeyF'&&!e.repeat)stopDriving();else keys.add(e.code);e.preventDefault();return;}if(crystal.key(e))return;if(inventory.key(e))return;if(inventory.busy)return;
 if(e.code==='KeyF'&&!e.repeat){e.preventDefault();if(!startDriving()&&!inventory.open())crystal.open();return;}
 if(e.target.matches('select,input,textarea'))return;
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)toggleDoor();
});
document.addEventListener('keyup',e=>{keys.delete(e.code);crystal.up(e);});
window.addEventListener('blur',showPause);
showPause();
const lightModes={morning:{pos:[-150,110,120],color:'#ffdfb0',power:3.4,hemi:1.85,warm:.3,fog:'#b8bfc0'},noon:{pos:[-130,210,95],color:'#fff0d5',power:3.6,hemi:2.1,warm:0,fog:'#b8c5c9'},golden:{pos:[-180,62,100],color:'#ffc48a',power:3.8,hemi:1.3,warm:.85,fog:'#c6ad91'}};
function setLight(name){const p=lightModes[name];sun.position.set(...p.pos);sun.color.set(p.color);sun.intensity=p.power*.47;rvSun.color.set(p.color);rvSun.intensity=p.power*.53;rvSun.position.copy(rvSun.target.position).add(sun.position.clone().normalize().multiplyScalar(30));hemi.intensity=p.hemi;scene.fog.color.set(p.fog);skyUniforms.sunDir.value.copy(sun.position).normalize();skyUniforms.warm.value=p.warm;document.querySelectorAll('[data-light]').forEach(b=>b.classList.toggle('active',b.dataset.light===name));}
document.querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>setLight(b.dataset.light));setLight('golden');
$('#quality').onchange=()=>{const high=$('#quality').value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.6:1));grass.visible=high;sun.shadow.mapSize.set(high?4096:2048,high?4096:2048);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}};
function enterRV(){if(rv.cutaway)rv.toggleCutaway();aim(rv.entry(),rv.world(-3.6,2.15,-.22));walking=true;}
function leaveRV(){aim(rv.exit(),rv.world(1.5,1.65,6));}
function toggleDoor(){if(hands.busy||!canInteractWithDoor())return;const p=rv.local(camera.position);if(Math.abs(p.x-1.51)<.65&&p.z>1.05&&p.z<1.65&&rv.opened){notice('Odsuń się od progu, aby zamknąć drzwi.');return;}hands.playDoor({validate:canInteractWithDoor,commit:()=>{rv.toggleDoor();}});}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
let frameCount=0;
function frame(now){requestAnimationFrame(frame);const dt=paused?0:Math.min((now-last)/1000,.05);last=now;elapsed+=dt;camera.rotation.set(pitch,yaw,0,'YXZ');
 let f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),r=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
 if(!driving&&(f||r)&&!hands.busy&&!crystal.active&&!inventory.active&&!inventory.busy&&!paused){walking=true;const interior=rv.isInside(camera.position);let speed=(interior?1.7:keys.has('ShiftLeft')||keys.has('ShiftRight')?11:4)*dt/Math.max(1,Math.hypot(f,r));let nx=clamp(camera.position.x+(-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,-290,145),nz=clamp(camera.position.z+(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed,-100,320);const old=rv.ground(camera.position.x,camera.position.z),next=rv.ground(nx,nz);const candidate=new THREE.Vector3(nx,camera.position.y,nz);if(next-old<Math.max(.28,speed*1.25)&&next<42&&!rv.blocks(camera.position,candidate)){camera.position.x=nx;camera.position.z=nz;}else{for(const trial of [new THREE.Vector3(nx,camera.position.y,camera.position.z),new THREE.Vector3(camera.position.x,camera.position.y,nz)]){const dy=rv.ground(trial.x,trial.z)-old;if(dy<Math.max(.28,speed*1.25)&&rv.ground(trial.x,trial.z)<42&&!rv.blocks(camera.position,trial))camera.position.copy(trial);}}camera.position.y=mix(camera.position.y,rv.ground(camera.position.x,camera.position.z)+(rv.isInside(camera.position)?1.62:1.72)+Math.sin(elapsed*9)*.012,Math.min(1,dt*12));}
 tickDriving(dt);updateCookingZone();rv.tick(dt);hands.tick(dt);crystal.tick(dt);inventory.tick(dt,{paused,blocked:driving||paused||(crystal.active&&crystal.state.step<5)});hands.root.visible=!rv.cutaway;if(driving)hands.driveGrip();
 $('#drive-hint').hidden=paused||(!driving&&!canDrive());$('#drive-hint').textContent=driving?Math.round(Math.abs(driveSpeed)*3.6)+(inCookingZone()?' km/h · STREFA GOTOWANIA':' km/h · POZA STREFĄ')+' · W/S gaz/cofanie · A/D skręt · Spacja hamulec · F wstań':'F · prowadź RV';
 if(frameCount%5===0){const available=!driving&&!hands.busy&&canInteractWithDoor();$('#door-hint').hidden=!available||paused||crystal.active||inventory.active||inventory.busy;$('#door-hint').textContent=rv.opened?'E · zamknij drzwi':'E · otwórz drzwi';}
 sky.position.copy(camera.position);frameCount++;
 renderer.render(scene,camera);
}
Promise.all([jesse.ready,hands.ready]).then(()=>{renderer.compile(scene,camera);last=performance.now();requestAnimationFrame(frame);$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),700);}).catch(error=>{$('#loadtext').textContent=error.message;});
window.addEventListener('webglcontextlost',()=>notice('Utracono połączenie z grafiką. Odśwież stronę, aby ponownie otworzyć mapę.'));
window.desertMap={inCookingZone,cookingZone,startDriving,stopDriving,get driving(){return driving;},showPause,resumeGame,get paused(){return paused;},reset,setLight,enterRV,leaveRV,rv,jesse,hands,crystal,inventory,getPosition:()=>camera.position.toArray(),stats:{rocks:rockCount,leafClusters:leaves.length,terrainVertices:tp.count,rv:rv.stats,jesse:jesse.stats}};
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 try{Promise.resolve(document.modelContext.registerTool({name:'configure_desert_view',description:'Set the desert lighting or return the camera to the clearing.',inputSchema:{type:'object',properties:{light:{type:'string',enum:['morning','noon','golden']},reset:{type:'boolean'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['light','reset'].includes(k))||(input.light!==undefined&&!Object.hasOwn(lightModes,input.light))||(input.reset!==undefined&&typeof input.reset!=='boolean'))throw new Error('Invalid view settings');if(input.light)setLight(input.light);if(input.reset)reset();return{position:camera.position.toArray(),light:document.querySelector('[data-light].active').dataset.light}}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
