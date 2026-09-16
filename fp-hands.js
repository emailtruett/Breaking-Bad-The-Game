import * as THREE from './vendor/three.module.js';
import { FP_GLOVE_DATA } from './assets/fp-glove.js';

// Camera-space hands use independent, mirrored skeletons; sockets remain available
// for later props. No objects or additional player actions are introduced here.
export function createFirstPersonHands({scene,camera,rv}){
 const root=new THREE.Group();root.name='First-person hands';camera.add(root);if(!camera.parent)scene.add(camera);
 const decode=(s,T)=>{const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new T(b.buffer);};
 const pending=[];
 function texture(uri){let resolve,reject;const p=new Promise((a,b)=>{resolve=a;reject=b;});pending.push(p);const t=new THREE.TextureLoader().load(uri,resolve,undefined,()=>reject(new Error('Nie udało się wczytać rękawiczek.')));t.anisotropy=8;return t;}
 const material=new THREE.MeshPhysicalMaterial({color:'#65b4dc',roughness:.78,metalness:0,normalMap:texture(FP_GLOVE_DATA.normalTexture),normalScale:new THREE.Vector2(.38,.38),roughnessMap:texture(FP_GLOVE_DATA.roughnessTexture),aoMap:texture(FP_GLOVE_DATA.aoTexture),aoMapIntensity:.55,clearcoat:.025,clearcoatRoughness:.65});
 // Rotate around the cuff-to-fingertip axis in both rest and contact poses.
 const wristOrientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
 const sleeveMaterial=new THREE.MeshStandardMaterial({color:'#c8b52e',roughness:.84});
 function hand(side){
  const mirror=side==='left'?-1:1;
  // The source hand faces the opposite palm direction; mirror the anatomy
  // independently of screen placement so the rolled thumbs stay medial.
  const sourceMirror=-mirror;
  const geometry=new THREE.BufferGeometry();
  for(const [name,size,T] of [['position',3,Float32Array],['normal',3,Float32Array],['uv',2,Float32Array],['skinIndex',4,Uint16Array],['skinWeight',4,Float32Array]]){
   const a=decode(FP_GLOVE_DATA[name],T);if(sourceMirror<0&&(name==='position'||name==='normal'))for(let i=0;i<a.length;i+=3)a[i]*=-1;
   geometry.setAttribute(name,new THREE.BufferAttribute(a,size));
  }
  geometry.setAttribute('uv1',geometry.attributes.uv.clone());
  const indices=decode(FP_GLOVE_DATA.index,Uint32Array);if(sourceMirror<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeBoundingSphere();
  const group=new THREE.Group();group.name=side+' wrist control';root.add(group);
  const skin=new THREE.SkinnedMesh(geometry,material);skin.name=side+' blue surgical glove';skin.frustumCulled=false;skin.castShadow=false;skin.receiveShadow=true;group.add(skin);
  const bones=FP_GLOVE_DATA.bones.map(b=>{const bone=new THREE.Bone();bone.name=side+'_'+b.name;return bone;});
  FP_GLOVE_DATA.bones.forEach((b,i)=>{const p=new THREE.Vector3(...b.position);p.x*=sourceMirror;if(b.parent>=0){const parent=new THREE.Vector3(...FP_GLOVE_DATA.bones[b.parent].position);parent.x*=sourceMirror;p.sub(parent);bones[b.parent].add(bones[i]);}else skin.add(bones[i]);bones[i].position.copy(p);});
  skin.bind(new THREE.Skeleton(bones));
  const grip=new THREE.Object3D();grip.name=side+' item socket';grip.position.set(0,-.014,-.148);bones[0].add(grip);
  const sleeveGeo=new THREE.BufferGeometry(),sleeveIndex=[];
  sleeveGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(17*25*3),3));
  for(let i=0;i<16;i++)for(let j=0;j<24;j++){const a=i*25+j,b=a+25;sleeveIndex.push(a,a+1,b,a+1,b+1,b);}
  sleeveGeo.setIndex(sleeveIndex);
  const sleeve=new THREE.Mesh(sleeveGeo,sleeveMaterial);sleeve.name=side+' fitted fabric sleeve';sleeve.frustumCulled=false;root.add(sleeve);
  // The supplied mesh already has a cuff; no detached decorative ring.
  const idle=new THREE.Vector3(mirror*.22,side==='left'?-.25:-.225,-.34);
  const idleQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(.20,mirror*-.12,mirror*-.12)).multiply(wristOrientation);
  group.position.copy(idle);group.quaternion.copy(idleQ);
  return {group,mesh:skin,bones,grip,sleeve,idle,idleQ,mirror,sourceMirror};
 }
 const left=hand('left'),right=hand('right');
 // Small hand-held stage props; existing RV vessels remain the work targets.
 const toolMaterial=new THREE.MeshStandardMaterial({color:'#bac6be',metalness:.65,roughness:.35});
 const handleMaterial=new THREE.MeshStandardMaterial({color:'#756847',roughness:.85});
 function tool(name){const g=new THREE.Group();g.name=name;right.grip.add(g);g.visible=false;return g;}
 function part(g,w,h,d,x,y,z,m=toolMaterial){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;}
 const scoop=tool('Stage scoop');part(scoop,.014,.012,.12,0,0,-.035);part(scoop,.055,.012,.052,0,0,-.11);
 const stirrer=tool('Glass stirring prop');part(stirrer,.008,.008,.21,0,0,-.065);
 const mallet=tool('Small prop mallet');part(mallet,.018,.018,.16,0,0,-.04,handleMaterial);part(mallet,.086,.04,.038,0,0,-.13);
 const screen=tool('Tray spatula');part(screen,.018,.01,.09,0,0,-.02);part(screen,.09,.008,.06,0,0,-.09);
 const tools=[scoop,stirrer,mallet,screen];
 function clearStation(){tools.forEach(t=>t.visible=false);}
 function animateStation({stage,time:t,pulse=0,x,portion=false,adjust=0}){
  if(rv.cutaway)return;clearStation();root.visible=true;camera.updateWorldMatrix(true,false);
  const stroke=Math.sin(t*2.6),tap=Math.sin(Math.PI*Math.min(1,pulse));
  let dx=0,dy=0,dz=0,grip=.50;
  if(stage===0){scoop.visible=true;dx=.09*stroke;dy=.035+.05*tap;}
  if(stage===1){stirrer.visible=true;dx=.052*Math.cos(t*3);dz=.052*Math.sin(t*3);dy=.055;grip=.72;}
  if(stage===2){dx=.11;dy=-.075;dz=.09;grip=.42;}
  if(stage===3){screen.visible=true;dx=.12*Math.sin(t*1.8);dy=-.04+.018*Math.sin(t*3.6);grip=.55;}
  if(stage===4){(portion?scoop:mallet).visible=true;dx=portion?.13*stroke:0;dy=portion?.015+.035*tap:.02+.14*tap;grip=.86;}
  for(const h of[left,right]){
   const support=h===left;
   const target=rv.world(x+(support?-.20:dx),1.88+(support?-.015:dy),-.69+(support?.02:dz));
   camera.worldToLocal(target);
   const shoulder=new THREE.Vector3(h.mirror*.24,-.39,.04),direction=target.clone().sub(shoulder).normalize();
   h.group.position.copy(target).addScaledVector(direction,support?-.15:-.23);
   h.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction).multiply(wristOrientation);
   if(!support&&stage===0)h.group.rotateZ(-.35*tap);
   if(!support&&stage===2)h.group.rotateZ(.16*Math.sin(t*2)+adjust*.30);
   curl(h,support?.38:grip);
   sleeve(h);
  }
  root.updateMatrixWorld(true);
 }
 function bagGripPose(){
  curl(right,.48);
  // Thumb opposes the curled index finger at the bag's sealed top edge.
  for(let j=0;j<3;j++){right.bones[4+j].rotation.x=[.32,.85,.62][j];right.bones[1+j].rotation.x=[.28,.52,.40][j];}
  right.bones[1].rotation.y=right.sourceMirror*-.64;
  right.bones[1].rotation.z=right.sourceMirror*.16;
 }
 function holdInventoryItem(){
  right.group.position.y+=.10;right.group.position.z-=.035;
  right.group.rotateX(-.12);bagGripPose();sleeve(right);root.updateMatrixWorld(true);
 }
 function driveGrip(){
  clearStation();camera.updateWorldMatrix(true,false);rv.steering.updateWorldMatrix(true,true);
  const wheelQ=rv.steering.getWorldQuaternion(new THREE.Quaternion());
  const cameraInverse=camera.getWorldQuaternion(new THREE.Quaternion()).invert();
  for(const h of [left,right]){
   // Use a palm contact point, rather than the fingertip socket for carried items.
   const contact=new THREE.Vector3(-.025,0,h.mirror*.215);
   const point=camera.worldToLocal(rv.steering.localToWorld(contact));
   // Thumb-to-little-finger axis runs vertically along the side of the rim.
   // Palms face inward and fingertips wrap forward, behind the wheel.
   const basis=new THREE.Matrix4().makeBasis(new THREE.Vector3(0,h.mirror,0),new THREE.Vector3(0,0,-h.mirror),new THREE.Vector3(-1,0,0));
   const pose=new THREE.Quaternion().setFromRotationMatrix(basis);
   h.group.quaternion.copy(cameraInverse).multiply(wheelQ).multiply(pose);
   const palm=new THREE.Vector3(0,.006,-.153);
   h.group.position.copy(point).sub(palm.clone().applyQuaternion(h.group.quaternion));
   h.driveContact=palm;
   // Separate proximal, middle and fingertip bends wrap the narrow rim.
   const bends=[[.65,1.30,.65],[.72,1.36,.72],[.76,1.38,.76],[.78,1.32,.72]];
   for(let digit=1;digit<5;digit++)for(let joint=0;joint<3;joint++){
    h.bones[1+digit*3+joint].rotation.set(bends[digit-1][joint],0,joint===0?h.sourceMirror*(digit-2.3)*.012:0);
   }
   for(let joint=0;joint<3;joint++)h.bones[1+joint].rotation.set([.18,.42,.32][joint],joint===0?h.sourceMirror*-.35:0,h.sourceMirror*[.08,.03,.01][joint]);
   sleeve(h,true);
  }
  root.updateMatrixWorld(true);
 }
 function animateItemTransfer({target,progress,put=false,release=false}){
  clearStation();camera.updateWorldMatrix(true,false);
  const t=THREE.MathUtils.smoothstep(progress,0,1),reach=put?Math.sin(t*Math.PI):1-t;
  const point=camera.worldToLocal(target.clone()),direction=point.clone().sub(new THREE.Vector3(.23,-.38,.01)).normalize();
  right.group.position.copy(right.idle).lerp(point.addScaledVector(direction,-.19),reach);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),direction).multiply(wristOrientation);
    right.group.quaternion.copy(right.idleQ).slerp(q,reach);bagGripPose();if(release)curl(right,-.12);sleeve(right);root.updateMatrixWorld(true);
 }
 let action=null,time=0;
 const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
 function curl(h,value){
  const relaxed=[.42,.14,.20,.26,.32];
  for(let digit=0;digit<5;digit++)for(let j=0;j<3;j++){
   const bone=h.bones[1+digit*3+j];
   const bend=relaxed[digit]+value*(digit===0?.36:.95);
   // Flex toward the palm, not backward, after the corrected wrist roll.
   bone.rotation.x=bend*[.65,1,.72][j];
   bone.rotation.y=digit===0&&j===0?h.sourceMirror*(-.36-value*.12):0;
   bone.rotation.z=digit===0?h.sourceMirror*(.07+value*.16):j===0?h.sourceMirror*(digit-2)*.015:0;
  }
 }
 function sleeve(h,seated=false){
  // Seated elbows sit low beside the torso, independently of the fixed wheel grip.
  const start=seated?camera.worldToLocal(rv.world(2.30,1.43,-.69+h.mirror*.25)):new THREE.Vector3(h.mirror*.29,-.62,.11);
  const axis=new THREE.Vector3(0,0,1).applyQuaternion(h.group.quaternion);
  const end=h.group.position.clone().addScaledVector(axis,.012);
  const elbow=seated?camera.worldToLocal(rv.world(2.43,1.39,-.69+h.mirror*.28)):start.clone().lerp(end,.36);
  const curve=new THREE.CubicBezierCurve3(start,elbow,end.clone().addScaledVector(axis,seated?.045:.13),end);
  const xAxis=new THREE.Vector3(1,0,0).applyQuaternion(h.group.quaternion);
  const positions=h.sleeve.geometry.attributes.position;
  for(let i=0;i<=16;i++){
   const t=i/16,center=curve.getPoint(t),tangent=curve.getTangent(t);
   const side=xAxis.clone().addScaledVector(tangent,-xAxis.dot(tangent)).normalize(),up=new THREE.Vector3().crossVectors(tangent,side).normalize();
   for(let j=0;j<=24;j++){
    const a=j/24*Math.PI*2,fold=1+Math.sin(i*2.1+a*3)*.045*Math.sin(Math.PI*t);
    const rx=THREE.MathUtils.lerp(.063,.037,t)*fold,ry=THREE.MathUtils.lerp(.052,.027,t)*fold;
    const p=center.clone().addScaledVector(side,Math.cos(a)*rx).addScaledVector(up,Math.sin(a)*ry);
    positions.setXYZ(i*25+j,p.x,p.y,p.z);
   }
  }
  positions.needsUpdate=true;h.sleeve.geometry.computeVertexNormals();
 }
 function cancel(){action=null;}
 function playDoor({commit,validate}){
  if(action||rv.cutaway)return false;
  action={elapsed:0,committed:false,commit,validate,origin:camera.position.clone()};return true;
 }
 function tick(dt){
  clearStation();time+=dt;root.visible=!rv.cutaway;
  if(rv.cutaway)cancel();
  let amount=0,gripAmount=.14;
  if(action){
   action.elapsed+=dt;
   // Recheck reach and view at the moment of contact; repeated E presses never queue.
   if(!action.committed&&(camera.position.distanceTo(action.origin)>.35||!action.validate()))cancel();
   if(action){
    if(action.elapsed>=.34&&!action.committed){action.committed=true;action.commit();}
    const t=action.elapsed;amount=t<.32?smooth(t/.32):t<.74?1:1-smooth((t-.74)/.44);
    gripAmount=.14+.82*smooth((t-.08)/.24)*(1-smooth((t-.76)/.30));
    if(t>=1.18)cancel();
   }
  }
  for(const h of[left,right]){
   h.group.position.copy(h.idle);h.group.position.y+=Math.sin(time*1.7)*.003;
   h.group.quaternion.copy(h.idleQ);curl(h,.14);
  }
  if(amount>0){
   rv.door.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
   // An open door rotates away from the RV wall. Select its camera-facing
   // surface in door space so fingers are not hidden behind the panel on closing.
   const doorCamera=rv.door.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
   const target=rv.door.localToWorld(new THREE.Vector3(.55,.9,doorCamera.z<0?-.11:.11));camera.worldToLocal(target);
   const start=new THREE.Vector3(.23,-.38,.01),direction=target.clone().sub(start).normalize();
   // The wrist leads the palm to the handle. Fingers close only during contact.
   const wrist=target.clone().addScaledVector(direction,-.185);
   right.group.position.lerp(wrist,amount);
   const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),direction).multiply(wristOrientation);
   right.group.quaternion.slerp(q,amount);curl(right,gripAmount);
   left.group.position.y-=amount*.025;
  }
  sleeve(left);sleeve(right);root.updateMatrixWorld(true);
 }
 tick(0);
 return {root,left,right,ready:Promise.all(pending),tick,playDoor,cancel,animateStation,clearStation,holdInventoryItem,animateItemTransfer,driveGrip,get busy(){return action!==null;},stats:{hands:2,bonesPerHand:16,trianglesPerHand:FP_GLOVE_DATA.triangles,source:'supplied glove',color:'light blue'}};
}



