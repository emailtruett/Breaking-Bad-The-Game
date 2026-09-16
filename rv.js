import * as THREE from './vendor/three.module.js';

// Model coordinates: +X front, +Z entry side, Y up. Units are metres.
// The supplied illustrated floorplan governs the prop placement. Hidden fittings
// and dimensions are reconstructed, not a claim of a measured production replica.
export function createRV({scene,height}) {
 const root=new THREE.Group();root.name='1986 Fleetwood Bounder';
 const shell=new THREE.Group(),entrySide=new THREE.Group(),roof=new THREE.Group(),inside=new THREE.Group();
 root.add(shell,entrySide,roof,inside);
 let rng=8671;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
 function texture(kind){
  const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');
  ctx.fillStyle={paint:'#e1d5b3',wood:'#796046',fabric:'#b4a389',floor:'#9f9275',curtain:'#aaa691',metal:'#a6aaa4'}[kind];ctx.fillRect(0,0,512,512);
  for(let i=0;i<22000;i++){const a=random()*.1;ctx.fillStyle=`rgba(${random()>.5?'255,249,214':'33,27,18'},${a})`;const x=random()*512,y=random()*512;ctx.fillRect(x,y,kind==='wood'?random()*110+5:random()*3+.5,kind==='fabric'?.7:random()*1.4+.3);}
  if(kind==='paint'){for(let y=0;y<512;y+=32){ctx.fillStyle='rgba(53,43,28,.24)';ctx.fillRect(0,y,512,1);ctx.fillStyle='rgba(255,255,231,.5)';ctx.fillRect(0,y+2,512,1);}for(let i=0;i<60;i++){const x=random()*512,y=random()*512;const g=ctx.createLinearGradient(0,y,0,y+random()*70+10);g.addColorStop(0,'rgba(106,78,36,.14)');g.addColorStop(1,'rgba(106,78,36,0)');ctx.fillStyle=g;ctx.fillRect(x,y,random()*7+1,70);}}
  if(kind==='fabric'||kind==='curtain'){for(let i=0;i<512;i+=4){ctx.fillStyle='rgba(39,33,22,.1)';ctx.fillRect(i,0,1,512);ctx.fillRect(0,i,512,1);}}
  if(kind==='curtain'){for(let i=0;i<512;i+=85){ctx.fillStyle='rgba(52,62,52,.30)';ctx.fillRect(i,0,15,512);ctx.fillRect(0,i,512,15);ctx.fillStyle='rgba(100,67,46,.35)';ctx.fillRect(i+19,0,3,512);ctx.fillRect(0,i+19,512,3);}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
 }
 const paintTex=texture('paint');paintTex.repeat.set(2.4,.72);
 const woodTex=texture('wood'),fabricTex=texture('fabric'),floorTex=texture('floor'),curtainTex=texture('curtain');
 const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...opts});
 const M={cream:mat('#ffffff',{map:paintTex}),trim:mat('#d1c29b'),red:mat('#a25139'),orange:mat('#cc8b44'),gold:mat('#d6b763'),black:mat('#161917'),rubber:mat('#242521'),steel:mat('#b9beba',{metalness:.68,roughness:.31}),darkSteel:mat('#595d59',{metalness:.55,roughness:.45}),glass:mat('#8ca9a1',{transparent:true,opacity:.2,roughness:.14,metalness:.15,depthWrite:false,side:THREE.DoubleSide}),wall:mat('#a59d83'),wood:mat('#fff',{map:woodTex}),fabric:mat('#fff',{map:fabricTex}),floor:mat('#fff',{map:floorTex}),curtain:mat('#fff',{map:curtainTex,side:THREE.DoubleSide}),ivory:mat('#c3b99b'),white:mat('#ddd9c7'),blue:mat('#3d657c'),yellow:mat('#c2b53e'),paper:mat('#d3cab5'),amber:mat('#d17d23',{emissive:'#a94c0b',emissiveIntensity:.3}),tail:mat('#991e12',{emissive:'#6d150a',emissiveIntensity:.3}),head:mat('#d3d3b5',{metalness:.25,roughness:.22}),fluor:mat('#f0dec0',{emissive:'#e7d5ab',emissiveIntensity:.65}),bottle:mat('#8e6d38',{transparent:true,opacity:.55,roughness:.22,depthWrite:false}),clear:mat('#bfd6d2',{transparent:true,opacity:.24,roughness:.12,metalness:.1,side:THREE.DoubleSide,depthWrite:false})};
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,24,16);
 function add(g,m,p,parent=inside){const o=new THREE.Mesh(g,m);o.position.set(...p);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 function box(x,y,z,w,h,d,m=M.cream,parent=inside){const o=add(boxGeo,m,[x,y,z],parent);o.scale.set(w,h,d);return o;}
 function sphere(x,y,z,sx,sy,sz,m,parent=inside){const o=add(sphereGeo,m,[x,y,z],parent);o.scale.set(sx,sy,sz);return o;}
 function cyl(x,y,z,rt,rb,h,m,parent=inside,n=24){return add(new THREE.CylinderGeometry(rt,rb,h,n),m,[x,y,z],parent);}
 function tube(points,r,m=M.steel,parent=inside){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*8),r,8,false),m,[0,0,0],parent);}
 function rod(a,b,r,m=M.steel,parent=inside){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),v=bb.clone().sub(aa);const o=add(new THREE.CylinderGeometry(r,r,v.length(),8),m,aa.add(bb).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
 function torus(x,y,z,r,t,m,parent=inside){return add(new THREE.TorusGeometry(r,t,10,40),m,[x,y,z],parent);}
 function roundRect(x,y,w,h,r=.05){const p=new THREE.Shape();p.moveTo(x-w/2+r,y-h/2);p.lineTo(x+w/2-r,y-h/2);p.quadraticCurveTo(x+w/2,y-h/2,x+w/2,y-h/2+r);p.lineTo(x+w/2,y+h/2-r);p.quadraticCurveTo(x+w/2,y+h/2,x+w/2-r,y+h/2);p.lineTo(x-w/2+r,y+h/2);p.quadraticCurveTo(x-w/2,y+h/2,x-w/2,y+h/2-r);p.lineTo(x-w/2,y-h/2+r);p.quadraticCurveTo(x-w/2,y-h/2,x-w/2+r,y-h/2);return p;}
 function panelShape(shape,m,z,parent=inside,depth=.045){return add(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10}),m,[0,0,z],parent);}
 function frame(x,y,z,w,h,m=M.black,parent=inside,b=.035){const shape=roundRect(x,y,w,h,.07),hole=roundRect(x,y,w-b*2,h-b*2,.045);shape.holes.push(new THREE.Path(hole.getPoints()));return panelShape(shape,m,z,parent,.025);}
 function label(text,x,y,z,w,h,{bg='#c4bda5',fg='#3d3830',size=54,parent=inside,rot=0}={}){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.font=`bold ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66,480);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshStandardMaterial({map:tex,roughness:.9});const o=add(new THREE.PlaneGeometry(w,h),m,[x,y,z],parent);o.rotation.y=rot;return o;}
 const solid=[];function obstacle(x,z,w,d){solid.push({x,z,w,d});}
 // Raised steel frame and underbody. Wheel wells cut through the actual sidewalls.
 box(0,.62,0,9.15,.26,2.26,M.darkSteel,shell);box(-.1,.84,0,9,.12,2.33,M.floor,inside);
 for(const z of [-.68,.68])box(-.2,.40,z,8.8,.15,.09,M.black,shell);
 for(const x of [-.85,3.5]){rod([x,.49,-1.10],[x,.49,1.10],.07,M.darkSteel,shell);}
 const windowsPlus=[[-3.45,2.24,1.46,.75],[.63,2.38,.88,.52],[2.24,2.25,.68,.79],[3.35,2.25,1,.76]];
 const windowsMinus=[[-3.35,2.24,1.58,.74],[-1.45,2.25,1.62,.74],[.45,2.25,1.62,.74],[2.1,2.25,.74,.74],[3.35,2.25,1,.76]];
 function side(sign){const parent=sign>0?entrySide:shell;
  const s=new THREE.Shape();s.moveTo(-4.62,.55);s.lineTo(-4.66,2.97);s.quadraticCurveTo(-4.65,3.18,-4.43,3.18);s.lineTo(3.65,3.18);s.lineTo(4.73,1.40);s.lineTo(4.62,.54);s.lineTo(4.08,.48);
  s.lineTo(4.08,.53);s.absarc(3.5,.53,.58,0,Math.PI,false);s.lineTo(-.27,.48);s.lineTo(-.27,.53);s.absarc(-.85,.53,.58,0,Math.PI,false);s.lineTo(-4.3,.48);s.closePath();
  for(const [x,y,w,h] of sign>0?windowsPlus:windowsMinus){const p=roundRect(x,y,w,h);s.holes.push(new THREE.Path(p.getPoints()));}
  if(sign>0){const p=roundRect(1.51,1.75,.73,1.93,.035);s.holes.push(new THREE.Path(p.getPoints()));}
  panelShape(s,M.cream,sign>0?1.22:-1.265,parent);
  // Interior wall liners have matching openings instead of covering windows.
  panelShape(s,M.wall,sign>0?1.205:-1.205,parent,.008);
  for(const [y,h,m] of [[1.12,.105,M.red],[1.225,.032,M.orange],[1.27,.024,M.gold],[3.015,.056,M.red],[3.069,.022,M.orange],[3.10,.021,M.gold]]){
   const spans=sign>0&&y<2?[[-4.56,1.135],[1.89,4.61]]:[[-4.56,y>3?3.69:4.61]];
   for(const [a,b]of spans)box((a+b)/2,y,sign*1.274,b-a,h,.009,m,parent);
  }
  for(const x of [-4.56,-2.45,1.08,3.72])box(x,1.81,sign*1.279,.019,2.59,.018,M.trim,parent);
  for(let x=-4.4;x<4.2;x+=.32)for(const y of [.66,2.96]){sphere(x,y,sign*1.283,.008,.008,.004,M.steel,parent);}
  for(const [x,w]of[[-3.6,1.33],[-2.05,1.1],[.23,1.05],[2.45,.82]]){
   if(x===.23||x< -1.8||x>2) {frame(x,.77,sign*1.284,w,.37,M.trim,parent,.018);box(x,.79,sign*1.294,.095,.025,.012,M.steel,parent);}
  }
  frame(-1.76,1.53,sign*1.28,.52,.38,M.trim,parent,.025);
  for(let k=0;k<12;k++)box(-1.76,1.375+k*.026,sign*1.31,.43,.009,.025,M.ivory,parent);
  box(-2.35,1.35,sign*1.29,.19,.12,.022,M.darkSteel,parent);
  for(let k=0;k<6;k++)box(-2.43+k*.028,1.35,sign*1.31,.008,.12,.01,M.steel,parent);
  for(const x of[-4.38,4.42])box(x,.82,sign*1.29,.09,.04,.017,M.amber,parent);
  // Faint surface oxidation and narrow scratches, deterministic across reloads.
  for(let k=0;k<65;k++){let x=-4.5+random()*8.1,y=.63+random()*2.39;const ws=sign>0?windowsPlus:windowsMinus;if(ws.some(([a,b,w,h])=>Math.abs(x-a)<w/2+.03&&Math.abs(y-b)<h/2+.08)||sign>0&&Math.abs(x-1.51)<.4)continue;const stain=box(x,y,sign*1.282,.002+random()*.006,.015+random()*.085,.002,M.trim,parent);stain.rotation.z=random()*.12;}
 }
 side(1);side(-1);
 function windowDetail([x,y,w,h],sign){const parent=sign>0?entrySide:shell;frame(x,y,sign*1.284,w+.055,h+.055,M.black,parent);box(x,y,sign*1.267,w-.025,h-.025,.008,M.glass,parent);box(x+w*.10,y,sign*1.301,.014,h-.04,.018,M.steel,parent);
  if(x<2.8){for(let j=0;j<Math.floor(h/.047);j++){const o=box(x,y-h/2+.035+j*.047,sign*1.178,w-.045,.027,.007,M.ivory,parent);o.rotation.x=-sign*.40;}
   for(const dx of [-w*.32,w*.32])rod([x+dx,y-h/2,sign*1.16],[x+dx,y+h/2,sign*1.16],.003,M.paper,parent);
   box(x,y+h/2+.065,sign*1.14,w+.09,.17,.065,M.curtain,parent);
   for(const e of [-1,1]){const g=new THREE.PlaneGeometry(.12,h+.13,10,1);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*140)*.022);g.computeVertexNormals();const curtain=add(g,M.curtain,[x+e*(w/2-.055),y,sign*1.115],parent);if(sign<0)curtain.rotation.y=Math.PI;}
  }
 }
 windowsPlus.forEach(w=>windowDetail(w,1));windowsMinus.forEach(w=>windowDetail(w,-1));
 // Tires, dual rear tires, stamped hubs, lug nuts and individual tread blocks.
 for(const x of[-.85,3.5])for(const sign of[-1,1]){
  const z=sign*1.17;let tire=cyl(x,.53,z,.485,.485,.25,M.rubber,shell,56);tire.rotation.x=Math.PI/2;
  const ring=torus(x,.53,sign*1.309,.392,.025,M.black,shell);ring.scale.y=1;
  let rim=cyl(x,.53,sign*1.311,.278,.278,.025,M.steel,shell,48);rim.rotation.x=Math.PI/2;
  torus(x,.53,sign*1.331,.249,.018,M.ivory,shell);sphere(x,.53,sign*1.34,.13,.13,.042,M.steel,shell);
  for(let j=0;j<8;j++){let a=j*Math.PI/4;sphere(x+Math.sin(a)*.172,.53+Math.cos(a)*.172,sign*1.336,.031,.031,.006,M.black,shell);sphere(x+Math.sin(a)*.082,.53+Math.cos(a)*.082,sign*1.382,.014,.014,.014,M.steel,shell);}
  for(let j=0;j<48;j++){let a=j*Math.PI/24;let o=box(x+Math.cos(a)*.481,.53+Math.sin(a)*.481,z,.036,.018,.23,M.black,shell);o.rotation.z=a+Math.PI/2;}
  const arch=add(new THREE.TorusGeometry(.565,.031,8,48,Math.PI),M.trim,[x,.53,sign*1.289],shell);
  box(x-.54,.37,sign*1.12,.04,.33,.23,M.black,shell);
 }
 // Split, raked windshield fitted between the side profiles.
 const frontGlass=new THREE.Group();frontGlass.position.set(4.14,2.23,0);frontGlass.rotation.z=.5236;root.add(frontGlass);
 box(0,0,0,.043,1.46,2.34,M.black,frontGlass);
 for(const sign of[-1,1]){box(.028,0,sign*.585,.008,1.36,1.105,M.glass,frontGlass);}
 for(const z of[-1.16,0,1.16])box(.042,0,z,.022,1.44,.025,M.trim,frontGlass);
 // Glass is transparent: a dark backing would hide the finished cockpit.
 frontGlass.remove(frontGlass.children[0]);
 for(const y of[-.715,.715])box(0,y,0,.07,.05,2.36,M.black,frontGlass);
 for(const z of[-1.17,1.17,0])box(0,0,z,.07,1.46,.035,M.black,frontGlass);
 box(4.625,1.16,0,.22,.75,2.43,M.cream,shell);box(4.73,.52,0,.13,.13,2.51,M.steel,shell);
 for(const [y,h,m]of[[1.29,.1,M.red],[1.385,.032,M.orange],[1.425,.026,M.gold]])box(4.749,y,0,.014,h,2.44,m,shell);
 for(const z of[-.49,.49]){box(4.752,1.04,z,.025,.31,.83,M.black,shell);for(let j=0;j<12;j++)box(4.773,.90+j*.025,z,.02,.006,.78,M.darkSteel,shell);}
 for(const z of[-1.005,1.005]){box(4.754,1.045,z,.045,.30,.24,M.trim,shell);box(4.78,1.075,z,.021,.155,.205,M.head,shell);box(4.78,.939,z,.021,.068,.204,M.amber,shell);for(let j=0;j<6;j++)box(4.792,1.018+j*.022,z,.005,.003,.19,M.steel,shell);}
 for(const z of[-.59,.59]){rod([4.66,1.6,z],[4.28,2.17,z+.08],.012,M.black,shell);rod([4.26,2.17,z-.23],[4.26,2.17,z+.35],.018,M.black,shell);}
 // Upper brow, marker lamps, external mirrors and their tubular supports.
 const brow=box(3.74,3.015,0,.39,.36,2.42,M.cream,shell);brow.rotation.z=.32;
 const badge=label('BOUNDER',3.98,3.03,0,.72,.12,{parent:shell,bg:'#cbbf9f',fg:'#6c614a',size:49,rot:Math.PI/2});
 const emblemShape=new THREE.Shape();emblemShape.moveTo(-.12,-.07);emblemShape.lineTo(-.035,-.018);emblemShape.quadraticCurveTo(-.045,.055,.015,.074);emblemShape.lineTo(.041,.115);emblemShape.lineTo(.043,.157);emblemShape.lineTo(.054,.161);emblemShape.lineTo(.062,.116);emblemShape.lineTo(.091,.105);emblemShape.lineTo(.093,.084);emblemShape.lineTo(.061,.082);emblemShape.lineTo(.046,.035);emblemShape.lineTo(.073,.014);emblemShape.lineTo(.062,.001);emblemShape.lineTo(.024,.017);emblemShape.lineTo(.004,-.013);emblemShape.lineTo(.043,-.045);emblemShape.lineTo(.068,-.049);emblemShape.lineTo(.069,-.062);emblemShape.lineTo(.015,-.062);emblemShape.lineTo(-.018,-.031);emblemShape.lineTo(-.035,-.048);emblemShape.lineTo(-.12,-.075);emblemShape.closePath();const emblem=add(new THREE.ExtrudeGeometry(emblemShape,{depth:.002,bevelEnabled:false}),M.wood,[3.98,3.01,-.55],shell);emblem.rotation.y=Math.PI/2;
 for(const z of[-.99,-.23,0,.23,.99])box(3.84,3.214,z,.085,.048,.083,M.amber,roof);
 for(const sign of[-1,1]){tube([[3.61,1.54,sign*1.26],[3.65,1.62,sign*1.50],[3.46,2.13,sign*1.56]],.016,M.steel,shell);box(3.46,2.14,sign*1.57,.07,.38,.20,M.black,shell);box(3.416,2.14,sign*1.57,.006,.33,.162,M.steel,shell);}
 // Rear wall, spare wheel, lamp clusters, license plate and roof ladder.
 box(-4.64,1.78,0,.09,2.52,2.43,M.cream,shell);
 for(const[y,h,m]of[[1.12,.105,M.red],[1.225,.032,M.orange],[1.27,.024,M.gold],[3.015,.056,M.red],[3.069,.022,M.orange]])box(-4.695,y,0,.014,h,2.43,m,shell);
 box(-4.73,.55,0,.16,.13,2.53,M.steel,shell);
 for(const sign of[-1,1]){box(-4.70,1.03,sign*.93,.03,.25,.22,M.black,shell);box(-4.726,1.07,sign*.93,.015,.14,.17,M.tail,shell);box(-4.726,.952,sign*.93,.015,.07,.17,M.head,shell);box(-4.71,2.92,sign*1.1,.02,.055,.105,M.tail,shell);}
 const spare=cyl(-4.82,1.22,0,.475,.475,.23,M.rubber,shell,48);spare.rotation.z=Math.PI/2;
 const cover=cyl(-4.95,1.22,0,.442,.442,.025,M.ivory,shell,48);cover.rotation.z=Math.PI/2;
 label('BOUNDER',-4.969,1.22,0,.60,.12,{parent:shell,rot:-Math.PI/2});
 label('NEW MEXICO  •  86',-4.797,.64,-.7,.29,.09,{parent:shell,bg:'#d7b958',fg:'#3d614e',size:36,rot:-Math.PI/2});
 for(const z of[.57,.99]){tube([[-4.88,.72,z],[-4.97,1.1,z],[-4.97,3.29,z],[-4.8,3.47,z],[-4.43,3.47,z],[-4.31,3.22,z]],.022,M.steel,shell);for(const y of[1.2,2.3,3.0])rod([-4.96,y,z],[-4.66,y,z],.016,M.steel,shell);}
 for(let y=.93;y<3.40;y+=.27)rod([-4.98,y,.57],[-4.98,y,.99],.022,M.steel,shell);
 // Folded awning on the passenger side and two roof air conditioners.
 const awning=cyl(-.2,3.205,1.34,.064,.064,8.53,M.ivory,roof);awning.rotation.z=Math.PI/2;
 for(const x of[-4.42,3.68]){box(x,2.0,1.32,.048,2.35,.065,M.steel,entrySide);box(x,1.6,1.36,.075,.18,.042,M.trim,entrySide);}
 box(-.52,3.18,0,8.30,.095,2.45,M.ivory,roof);
 for(const x of[-3.45,2.3]){
  box(x,3.275,0,1.08,.06,.83,M.black,roof);const unit=box(x,3.415,0,.95,.24,.75,M.white,roof);
  for(const z of[-.379,.379])for(let j=0;j<20;j++)box(x-.36+j*.036,3.405,z,.012,.135,.01,M.darkSteel,roof);
  for(let j=0;j<15;j++)box(x-.34+j*.046,3.54,0,.013,.005,.56,M.trim,roof);
 }
 for(const x of[-1.9,.25]){box(x,3.25,0,.46,.1,.43,M.trim,roof);sphere(x,3.30,0,.21,.055,.19,M.white,roof);}
 cyl(-2.9,3.36,-.80,.055,.055,.31,M.ivory,roof);sphere(-2.9,3.535,-.80,.09,.023,.09,M.white,roof);
 tube([[.75,3.29,-.6],[.78,3.55,-.6],[1.38,3.56,-.6]],.012,M.steel,roof);for(let x=.93;x<1.45;x+=.1)rod([x,3.56,-.82],[x,3.56,-.38],.008,M.steel,roof);
 // Side entry, screen frame, aluminum threshold, folding steps and grab handle.
 frame(1.51,1.75,1.282,.78,1.98,M.trim,entrySide,.027);
 box(1.51,.865,1.28,.77,.055,.18,M.steel,entrySide);
 for(let i=0;i<3;i++){box(1.51,.23+i*.205,1.90-i*.20,.78,.065,.29,M.darkSteel,shell);for(let j=0;j<5;j++)box(1.51,.267+i*.205,1.80-i*.20+j*.045,.72,.003,.009,M.black,shell);}
 tube([[2.03,1.48,1.29],[2.03,1.53,1.40],[2.03,1.96,1.40],[2.03,2.01,1.29]],.016,M.steel,entrySide);
 const door=new THREE.Group();door.position.set(1.14,.82,1.29);root.add(door);
 let doorPanel=roundRect(.355,.935,.705,1.85,.035);const doorWindow=roundRect(.355,1.37,.46,.62,.04);doorPanel.holes.push(new THREE.Path(doorWindow.getPoints()));panelShape(doorPanel,M.cream,-.02,door,.047);
 frame(.355,1.37,.032,.49,.65,M.black,door,.024);box(.355,1.37,.042,.445,.61,.009,M.glass,door);
 box(.355,.295,.038,.705,.10,.009,M.red,door);box(.355,.390,.038,.705,.025,.009,M.gold,door);
 box(.57,.87,.064,.065,.11,.034,M.steel,door);box(.55,.9,.085,.084,.022,.025,M.black,door);
 for(const x of[.055,.65])box(x,.48,-.035,.018,.78,.012,M.trim,door);
 // Five irregular marks at the iconic damaged area, taped on the interior face.
 for(const[x,y]of[[.17,.99],[.33,.84],[.46,1.04],[.51,.71],[.23,.65]]){sphere(x,y,.039,.014,.017,.005,M.black,door);const tape=box(x,y,-.041,.055,.043,.003,M.darkSteel,door);tape.rotation.z=.3+random()*.3;}
 // Interior ceiling and the long worn runner beneath the fluorescent fixtures.
 box(-.53,3.105,0,8.15,.075,2.34,M.wall,roof);
 for(const x of[-3.25,-.5,1.58]){box(x,3.052,0,.90,.055,.29,M.trim,roof);box(x,3.016,0,.79,.018,.225,M.fluor,roof);for(const a of[-.32,0,.32])box(x+a,3.005,0,.012,.01,.23,M.steel,roof);}
 for(const x of[-3.45,2.3]){box(x,2.99,0,.54,.115,.48,M.white,roof);for(let k=0;k<8;k++)box(x-.2+k*.055,2.929,0,.02,.006,.31,M.trim,roof);}
 box(-.6,.914,0,6.85,.016,.70,M.fabric,inside);box(2.36,.915,0,1.02,.022,1.96,M.blue,inside);
 for(let x=-4.43;x<2.8;x+=.55)box(x,.907,0,.007,.002,2.28,M.trim,inside);
 // Cockpit: paired captain's chairs, stitched upholstery, armrests and pedestal bases.
 function seat(x,z){cyl(x,1.08,z,.075,.095,.34,M.darkSteel);box(x,1.27,z,.62,.18,.61,M.fabric);const back=box(x-.27,1.64,z,.16,.68,.62,M.fabric);back.rotation.z=-.10;sphere(x-.30,2.01,z,.09,.075,.28,M.fabric);
  for(const side of[-1,1]){box(x-.025,1.55,z+side*.36,.47,.07,.075,M.fabric);rod([x-.16,1.32,z+side*.3],[x-.16,1.52,z+side*.34],.022,M.steel);}
  for(const dz of[-.2,-.1,0,.1,.2])box(x-.176,1.65,z+dz,.005,.55,.006,M.trim);
  tube([[x-.3,1.29,z-.27],[x+.24,1.37,z-.28],[x+.25,1.33,z+.04]],.019,M.black);
  obstacle(x,z,.79,.78);
 }
 seat(2.76,-.69);seat(2.76,.69);
 box(4.02,1.50,0,.91,.32,2.19,M.wood);box(3.9,1.683,0,1.01,.10,2.22,M.trim);
 box(3.49,1.82,-.67,.14,.32,.82,M.black);const dash=label('0    20    40    60    80',3.405,1.84,-.68,.69,.16,{bg:'#181c19',fg:'#b7b6a3',size:38,rot:-Math.PI/2});
 for(const z of[-.94,-.70,-.47]){const dial=cyl(3.392,1.83,z,.073,.073,.008,M.black,inside,32);dial.rotation.z=Math.PI/2;const ring=torus(3.387,1.83,z,.066,.006,M.steel);ring.rotation.y=Math.PI/2;rod([3.378,1.83,z],[3.375,1.88,z+.035],.004,M.paper);}
 rod([3.46,1.38,-.69],[3.13,1.89,-.69],.033,M.black);
 const steering=new THREE.Group();steering.position.set(3.11,1.91,-.69);steering.rotation.z=-.60;root.add(steering);const wheel=torus(0,0,0,.215,.022,M.black,steering);wheel.rotation.y=Math.PI/2;
 for(let a=0;a<Math.PI*2;a+=Math.PI*2/3)rod([0,0,0],[0,Math.cos(a)*.198,Math.sin(a)*.198],.012,M.darkSteel,steering);sphere(0,0,0,.034,.055,.055,M.black,steering);
 box(3.22,1.05,-.55,.18,.055,.09,M.black).rotation.z=.4;box(3.27,1.06,-.81,.21,.065,.13,M.black).rotation.z=.4;
 box(3.75,1.525,.09,.22,.14,.40,M.black);label('FM   94.1',3.63,1.54,.09,.25,.04,{bg:'#20251c',fg:'#a29c68',size:42,rot:-Math.PI/2});
 for(const z of[-.14,.30]){const knob=cyl(3.62,1.52,z,.025,.025,.026,M.black);knob.rotation.z=Math.PI/2;}
 for(const z of[-.85,.82]){box(4.2,1.74,z,.30,.01,.19,M.black);for(let j=0;j<6;j++)box(4.09+j*.04,1.75,z,.011,.008,.17,M.trim);}
 box(3.14,1.12,0,.86,.38,.53,M.fabric);cyl(3.06,1.32,-.14,.045,.045,.01,M.black);cyl(3.06,1.32,.14,.045,.045,.01,M.black);
 for(const z of[-.62,.62])box(3.45,2.96,z,.16,.045,.73,M.fabric);
 // Driver-side continuous workbench, double sink and period wood cupboards.
 const trashDoor=new THREE.Group();trashDoor.name='Under-sink bin cabinet';trashDoor.position.set(-1.165,1.005,-.593);root.add(trashDoor);
 for(const x of[-3.56,-2.37,-1.18,.02,1.23]){
  if(x!==-1.18)box(x,1.285,-.895,1.12,.69,.57,M.wood);
  else{box(-1.46,1.285,-.895,.56,.69,.57,M.wood);box(-.635,1.285,-.895,.028,.69,.57,M.wood);box(-.91,1.285,-1.165,.55,.69,.035,M.wood);box(-.91,.957,-.895,.55,.035,.57,M.wood);}box(x,1.665,-.862,1.19,.085,.68,M.trim);
  for(const dx of[-.27,.27]){if(x===-1.18&&dx===.27)continue;box(x+dx,1.28,-.593,.51,.55,.032,M.wood);frame(x+dx,1.28,-.571,.45,.48,M.trim,inside,.018);box(x+dx+.17,1.34,-.539,.045,.016,.025,M.steel);}
  obstacle(x,-.90,1.18,.61);
 }
 box(.255,.275,0,.51,.55,.032,M.wood,trashDoor);frame(.255,.275,.022,.45,.48,M.trim,trashDoor,.018);box(.425,.335,.054,.045,.016,.025,M.steel,trashDoor);
 const binMaterial=mat('#555e59',{roughness:.65,side:THREE.DoubleSide});
 const bin=new THREE.Mesh(new THREE.CylinderGeometry(.174,.14,.34,24,1,true),binMaterial);bin.position.set(-.91,1.15,-.895);inside.add(bin);
 cyl(-.91,1.0,-.895,.137,.137,.012,M.black);cyl(-.91,1.19,-.895,.155,.14,.02,M.black);
 torus(-.91,1.322,-.895,.174,.011,M.black).rotation.x=Math.PI/2;
 function sink(x,z){box(x,1.714,z,.82,.036,.51,M.steel);for(const dx of[-.205,.205]){box(x+dx,1.727,z,.35,.011,.41,M.darkSteel);box(x+dx,1.737,z,.28,.008,.33,M.steel);const drain=cyl(x+dx,1.745,z,.027,.027,.002,M.black);}
  tube([[x,1.74,z-.20],[x,1.96,z-.20],[x,2.04,z-.10],[x,1.96,z+.04]],.012,M.steel);for(const dx of[-.12,.12]){cyl(x+dx,1.76,z-.20,.023,.026,.035,M.steel);box(x+dx,1.785,z-.17,.018,.013,.063,M.steel);}}
 sink(-.67,-.86);
 // Glass props and metal support stands. These are static set dressing.
 function flask(x,y,z,r=.14){sphere(x,y+r*.82,z,r,r,r,M.clear);cyl(x,y+r*1.85,z,r*.23,r*.25,r*.9,M.clear);torus(x,y+r*2.30,z,r*.26,.009,M.clear).rotation.x=Math.PI/2;torus(x,y+.022,z,r*.73,.018,M.darkSteel).rotation.x=Math.PI/2;}
 function beaker(x,y,z,r=.065,h=.20){cyl(x,y+h/2,z,r,r,h,M.clear,inside,28);torus(x,y+h,z,r,.006,M.clear).rotation.x=Math.PI/2;for(let i=1;i<5;i++)box(x+r*.8,y+h*i/5,z+r*.6,.025,.003,.002,M.white);}
 function tray(x,y,z,w=.56,d=.36){box(x,y,z,w,.014,d,M.steel);for(const s of[-1,1]){box(x+s*w/2,y+.02,z,.012,.043,d,M.steel);box(x,y+.02,z+s*d/2,w,.043,.012,M.steel);}}
 for(const[x,r]of[[-3.90,.18],[-3.32,.23],[-2.67,.20],[-2.09,.18]]){flask(x,1.74,-.85,r);rod([x-.26,1.73,-1.04],[x-.26,2.45,-1.04],.009,M.steel);rod([x-.26,2.23,-1.04],[x,2.23,-.87],.008,M.steel);box(x-.26,1.729,-.98,.19,.023,.20,M.darkSteel);}
 for(const x of[-4.06,-2.78,-1.53,.20,.50,1.50])beaker(x,1.72,-.62,.035+random()*.025,.10+random()*.18);
 tray(.59,1.72,-.88,.61,.40);tray(-1.39,1.73,-.91,.48,.32);
 cyl(.95,1.75,-.67,.077,.08,.08,M.ivory);box(.95,1.809,-.67,.08,.005,.08,M.paper);
 for(let i=0;i<3;i++){box(1.19+i*.06,1.721,-.6,.10,.006,.034,M.paper).rotation.y=i*.4;}
 cyl(-1.76,1.88,-.96,.071,.071,.29,M.paper);cyl(-1.76,2.03,-.96,.018,.018,.006,M.wood);
 box(-1.70,1.85,-.96,.006,.25,.115,M.paper).rotation.z=.16;
 // Entry-side appliance bank, small refrigerator, drawer hardware and shelf clutter.
 // Open cavity behind the white storage door, retaining the adjacent drawer bank.
 box(-1.18,1.25,.91,.49,.70,.52,M.wood);
 box(-2.245,1.25,.91,.025,.70,.52,M.wood);box(-1.55,1.25,.91,.025,.70,.52,M.wood);
 box(-1.90,1.25,1.155,.67,.70,.035,M.wood);box(-1.90,.935,.91,.67,.05,.52,M.wood);
 box(-1.90,1.28,.94,.64,.022,.40,M.trim);
box(-1.70,1.63,.90,1.63,.075,.64,M.trim);obstacle(-1.70,.92,1.64,.62);
 const storageDoor=new THREE.Group();storageDoor.name='White storage cabinet door';storageDoor.position.set(-2.235,.97,.617);root.add(storageDoor);
 box(.335,.325,0,.67,.65,.06,M.ivory,storageDoor);box(.645,.52,-.043,.035,.11,.035,M.black,storageDoor);frame(.335,.325,-.038,.62,.60,M.trim,storageDoor,.017);

 box(-1.18,1.37,.62,.49,.47,.03,M.wood);for(const y of[1.19,1.39,1.57]){box(-1.18,y,.59,.45,.017,.014,M.trim);box(-1.18,y+.055,.565,.12,.019,.025,M.steel);}
 box(-1.57,1.85,.90,.65,.35,.45,M.ivory);box(-1.57,1.86,.661,.51,.22,.01,M.black);frame(-1.57,1.86,.648,.53,.25,M.steel,inside,.013);
 for(const x of[-1.78,-1.35])cyl(x,2.04,.90,.027,.027,.025,M.black);
 label('FIELD EQUIPMENT',-1.57,1.71,.647,.4,.055,{size:39});
 for(let i=0;i<4;i++){box(-2.30,1.72+i*.075,.92,.32,.063,.34,i%2?M.paper:M.blue);}
 box(-2.44,2.73,.98,1.92,.51,.39,M.wood);for(const x of[-2.89,-1.98]){box(x,2.73,.769,.86,.44,.028,M.wood);frame(x,2.73,.75,.79,.37,M.trim,inside,.013);box(x+.28,2.61,.723,.08,.013,.018,M.steel);}
 // Bed with a blue cover at rear entry-side, pillow, seam and fold geometry.
 box(-3.53,1.06,.67,1.88,.29,.96,M.wood);box(-3.53,1.28,.67,1.86,.18,.94,M.fabric);obstacle(-3.53,.69,1.91,1.0);
 box(-3.98,1.397,.68,.47,.15,.69,M.paper);box(-3.36,1.395,.67,1.45,.075,.95,M.blue);
 for(let i=0;i<22;i++){const o=box(-4.02+i*.061,1.436,.67,.017,.01,.88,M.blue);o.rotation.y=Math.sin(i)*.012;}
 box(-2.98,1.335,1.13,.69,.20,.015,M.blue);
 // Stool and period office chair, both kept clear of the central aisle.
 cyl(-2.52,1.21,.51,.21,.21,.085,M.black);rod([-2.52,.92,.51],[-2.52,1.2,.51],.033,M.steel);
 for(let a=0;a<6.28;a+=1.256)rod([-2.52,.96,.51],[-2.52+Math.cos(a)*.23,.93,.51+Math.sin(a)*.23],.014,M.black);
 box(-2.65,1.50,.66,.09,.38,.34,M.black);
 // Barrel hoops, rolled rim, lid bung fittings and a worn cylinder cradle.
 function barrel(x,z,r=.255,h=.78,m=M.darkSteel){cyl(x,.91+h/2,z,r*.98,r,h,m);for(const y of[.94,1.12,.91+h-.18,.91+h])torus(x,y,z,r,.012,M.steel).rotation.x=Math.PI/2;cyl(x,.918+h,z,r*.955,r*.955,.014,m);cyl(x+r*.46,.94+h,z,.026,.026,.025,M.steel);obstacle(x,z,r*2,r*2);}
 barrel(.08,.92,.26,.82);barrel(-.53,.93,.25,.72,M.red);
 label('PROPERTY',.08,1.41,.646,.22,.075,{bg:'#a99c7d',size:43});
 // Fire extinguishers, yellow coveralls, respirator, cooler and cardboard cartons.
 function extinguisher(x,z){cyl(x,1.53,z,.07,.07,.39,M.red);sphere(x,1.74,z,.07,.042,.07,M.red);cyl(x,1.79,z,.019,.019,.065,M.steel);box(x,1.82,z,.08,.021,.025,M.black);tube([[x+.035,1.8,z],[x+.105,1.76,z],[x+.10,1.42,z]],.009,M.black);label('FIRE',x,1.55,z+.072,.078,.12,{bg:'#c9bea2',fg:'#932317',size:48});}
 extinguisher(1.02,1.12);extinguisher(-4.29,-1.05);
 box(-3.10,1.1,-.90,.57,.31,.40,M.blue);box(-3.10,1.28,-.9,.6,.075,.43,M.white);
 for(const x of[-.4,.16]){box(x,1.035,-.86,.35,.24,.32,M.paper);const flap=box(x+.10,1.20,-.86,.20,.011,.32,M.paper);flap.rotation.z=.35;}
 sphere(1.5,1.81,-.93,.09,.1,.075,M.black);for(const dx of[-.09,.09]){const filter=cyl(1.5+dx,1.76,-.91,.047,.047,.07,M.ivory);filter.rotation.x=Math.PI/2;}
 tube([[1.44,1.89,-.92],[1.42,2.03,-.96],[1.56,2.04,-.96],[1.57,1.87,-.92]],.012,M.black);
 for(const[x,z]of[[-4.17,-.70],[.29,1.01],[.6,1.03]]){cyl(x,1.02,z,.095,.1,.22,M.white);box(x,1.15,z,.06,.04,.07,M.white);}
 // Wall-mounted fan, outlets, cable coils and paper notes.
 const fan=new THREE.Group();fan.position.set(-.9,2.68,1.01);fan.rotation.x=-.14;inside.add(fan);torus(0,0,0,.16,.011,M.steel,fan);sphere(0,0,-.015,.05,.05,.04,M.black,fan);
 for(let a=0;a<Math.PI*2;a+=Math.PI/6)rod([0,0,.025],[Math.cos(a)*.16,Math.sin(a)*.16,.025],.004,M.steel,fan);
 for(let a=0;a<Math.PI*2;a+=Math.PI*2/3){const blade=sphere(Math.cos(a)*.077,Math.sin(a)*.077,0,.086,.026,.008,M.ivory,fan);blade.rotation.z=a;}
 for(const x of[-1.1,.40]){box(x,1.94,1.17,.07,.11,.02,M.ivory);for(const y of[1.915,1.96]){box(x-.012,y,1.155,.004,.018,.005,M.black);box(x+.012,y,1.155,.004,.018,.005,M.black);}}
 for(let i=0;i<6;i++)torus(-.82,1.10+i*.013,.72,.12,.007,M.black).rotation.x=Math.PI/2;
 const note=label('NOTES',-.73,2.22,1.178,.16,.21,{parent:inside,bg:'#c4b794',size:40,rot:Math.PI});
 const magazine=box(-.8,.933,.12,.26,.013,.19,M.paper);magazine.rotation.y=.38;
 const page=label('ROAD ATLAS',-.8,.942,.12,.225,.14,{bg:'#c1b798',fg:'#5a675c',size:43});page.rotation.x=-Math.PI/2;page.rotation.z=.38;
 for(const x of[-3.9,-2.6,.72]){box(x,2.94,-1.07,.11,.018,.08,M.ivory);sphere(x,2.936,-1.07,.02,.012,.02,M.steel);}
 // Gathered privacy drapes, kept tied back so the sleeping area stays accessible.
 for(const sign of[-1,1]){const g=new THREE.PlaneGeometry(.28,1.85,24,4),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*95)*.023);g.computeVertexNormals();const c=add(g,M.curtain,[-4.28,1.97,sign*.94]);c.rotation.y=Math.PI/2;}
 // Small fixtures and ceiling rails tie the interior together.
 rod([-4.42,2.95,-1.08],[-4.42,2.95,1.07],.012,M.steel,inside);
 for(let z=-1;z<1.1;z+=.16){const ring=torus(-4.42,2.91,z,.025,.004,M.steel);ring.rotation.y=Math.PI/2;}
 for(const x of[-4.37,2.67])for(const z of[-1.15,1.15])box(x,2.14,z,.021,1.72,.023,M.trim,inside);
 // Warm, low-energy practicals keep the room readable without flattening daylight.
 const practicals=[];for(const x of[-3.2,-.65,1.45]){const l=new THREE.PointLight('#ffe2b3',.9,4.5,2);l.position.set(x,2.79,0);inside.add(l);practicals.push(l);}
 // Batch immutable geometry by material. Hundreds of fasteners remain inexpensive.
 function batch(group){group.updateMatrixWorld(true);const bins=new Map(),meshes=[];group.traverse(o=>{if(!o.isMesh)return;meshes.push(o);const key=o.material.uuid;if(!bins.has(key))bins.set(key,{material:o.material,geos:[]});let g=o.geometry.clone();if(g.index){const a=g.toNonIndexed();g.dispose();g=a;}const inv=new THREE.Matrix4().copy(group.matrixWorld).invert();g.applyMatrix4(inv.multiply(o.matrixWorld));bins.get(key).geos.push(g);});
  for(const o of meshes)o.removeFromParent();
  for(const {material,geos}of bins.values()){const g=new THREE.BufferGeometry();for(const name of['position','normal','uv']){const size=name==='uv'?2:3;const len=geos.reduce((n,a)=>n+a.attributes.position.count*size,0),data=new Float32Array(len);let offset=0;for(const a of geos){const attr=a.getAttribute(name);if(attr)data.set(attr.array,offset);offset+=a.attributes.position.count*size;}g.setAttribute(name,new THREE.BufferAttribute(data,size));}g.computeBoundingSphere();g.computeBoundingBox();const o=new THREE.Mesh(g,material);o.updateMatrix();o.matrixAutoUpdate=false;o.castShadow=!material.transparent;o.receiveShadow=true;group.add(o);for(const a of geos)a.dispose();}
 }
 [shell,entrySide,roof,inside,frontGlass,door].forEach(batch);
 const baseX=25,baseZ=76,baseY=height(baseX,baseZ);root.position.set(baseX,baseY,baseZ);root.rotation.y=-.20;scene.add(root);root.updateMatrixWorld(true);
 let opened=true,cutaway=false,doorAngle=-Math.PI*.62;door.rotation.y=doorAngle;
 const local=p=>root.worldToLocal(p.clone()),world=(x,y,z)=>root.localToWorld(new THREE.Vector3(x,y,z));
 function isInside(p){const q=local(p);return q.x> -4.43&&q.x<4.35&&Math.abs(q.z)<1.18&&q.y>.87;}
 function ground(x,z){const p=local(new THREE.Vector3(x,root.position.y,z));const inBody=p.x> -4.5&&p.x<4.48&&Math.abs(p.z)<1.21;if(inBody)return root.position.y+.905;
  if(p.x>1.11&&p.x<1.91&&p.z>1.20&&p.z<2.1)return root.position.y+(.23+Math.floor(THREE.MathUtils.clamp((2.10-p.z)/.20,0,2))*.205)+.033;
  return height(x,z);
 }
 function blocks(a,b){const q=local(b),p=local(a),rad=.16;
  const inB=q.x> -4.64-rad&&q.x<4.77+rad&&Math.abs(q.z)<1.26+rad;
  if(!inB)return false;
  const inA=p.x> -4.44&&p.x<4.45&&Math.abs(p.z)<1.08;
  const passage=q.x>1.15+rad&&q.x<1.87-rad&&q.z>.85&&p.x>1.15+rad&&p.x<1.87-rad;
  if(passage&&opened)return false;
  if(!inA)return true;
  if(q.x< -4.40+rad||q.x>3.51||Math.abs(q.z)>1.09-rad)return true;
  for(const o of solid)if(Math.abs(q.x-o.x)<o.w/2+rad&&Math.abs(q.z-o.z)<o.d/2+rad)return true;
  return false;
 }
 const api={root,door,storageDoor,trashDoor,solid,steering,baseY,world,local,isInside,ground,blocks,
  get opened(){return opened},get cutaway(){return cutaway},
  toggleDoor(){opened=!opened;return opened},
  toggleCutaway(){cutaway=!cutaway;roof.visible=!cutaway;entrySide.visible=!cutaway;frontGlass.visible=!cutaway;door.visible=!cutaway;return cutaway},
  tick(dt){const target=opened?-Math.PI*.62:0;doorAngle=THREE.MathUtils.damp(doorAngle,target,8,dt);door.rotation.y=doorAngle;},
  entry:()=>world(1.51,2.53,.53),exit:()=>world(1.51,1.72,2.45),
  exterior:()=>world(9.5,3.15,9.4),overview:()=>world(2.3,10.8,7.1),
  stats:{staticMeshes:0,triangles:0,materials:0}
 };
 const materials=new Set();root.traverse(o=>{if(o.isMesh){api.stats.staticMeshes++;api.stats.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materials.add(o.material.uuid)}});api.stats.materials=materials.size;
 return api;
}
