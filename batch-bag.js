import * as THREE from './vendor/three.module.js';
import { CRYSTAL_BAG_DATA } from './assets/crystal-bag.js';
export function createBatchBag(item){
 const group=new THREE.Group();group.name='Partia · '+item.purity.toFixed(1)+'%';group.userData.item={...item};group.userData.source='User-supplied whitepowder-bag FBX';
 const decode=s=>{const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new Float32Array(bytes.buffer);};
 function geometry(part){const g=new THREE.BufferGeometry();for(const [n,size] of [['position',3],['normal',3],['uv',2]])g.setAttribute(n,new THREE.BufferAttribute(decode(part[n]),size));g.computeBoundingSphere();return g;}
 const tint=new THREE.Color('#f3f2eb').lerp(new THREE.Color('#007cd9'),Math.pow(Math.max(0,Math.min(99.1,item.purity))/99.1,1.2));
 // Neutral faceted texture is multiplied by batch color; no powder image is used.
 const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d');cx.fillStyle='#aeb7b8';cx.fillRect(0,0,512,512);
 let seed=731;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const grid=[];for(let y=0;y<=20;y++){grid[y]=[];for(let x=0;x<=20;x++)grid[y][x]=[x*25.6+(x>0&&x<20?(random()-.5)*21:0),y*25.6+(y>0&&y<20?(random()-.5)*21:0)];}
 for(let y=0;y<20;y++)for(let x=0;x<20;x++)for(const tri of [[grid[y][x],grid[y][x+1],grid[y+1][x]],[grid[y][x+1],grid[y+1][x+1],grid[y+1][x]]]){const shade=Math.floor(155+random()*100);cx.fillStyle=`rgb(${shade},${shade},${shade})`;cx.beginPath();cx.moveTo(...tri[0]);cx.lineTo(...tri[1]);cx.lineTo(...tri[2]);cx.closePath();cx.fill();cx.strokeStyle='rgba(255,255,255,.35)';cx.lineWidth=.6;cx.stroke();}
 const facets=new THREE.CanvasTexture(c);facets.colorSpace=THREE.SRGBColorSpace;facets.anisotropy=8;
 const coreMat=new THREE.MeshPhysicalMaterial({color:tint,map:facets,bumpMap:facets,bumpScale:.0011,roughness:.29,metalness:.02,clearcoat:.32});
 const fill=geometry(CRYSTAL_BAG_DATA.parts[0]);const core=new THREE.Mesh(fill,coreMat);core.name='Faceted crystal filling';core.visible=false;group.add(core);
 // Area-weighted sampling spreads crystals over faces, not just mesh corners.
 // No opaque powder/core surface hides the actual 3D filling.
 const points=fill.attributes.position,triangles=[],a=new THREE.Vector3(),b=new THREE.Vector3(),cornerC=new THREE.Vector3();let area=0;
 for(let i=0;i<points.count;i+=3){a.fromBufferAttribute(points,i);b.fromBufferAttribute(points,i+1);cornerC.fromBufferAttribute(points,i+2);const weight=b.clone().sub(a).cross(cornerC.clone().sub(a)).length()*.5;area+=weight;triangles.push(area);}
 const shardMaterial=new THREE.MeshPhysicalMaterial({color:tint,roughness:.23,metalness:.015,flatShading:true,clearcoat:.28});
 const shards=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),shardMaterial,720);shards.name='Individual crystal facets';
 const transform=new THREE.Object3D();
 for(let i=0;i<720;i++){
  const sample=random()*area;let tri=0;while(tri<triangles.length-1&&triangles[tri]<sample)tri++;
  a.fromBufferAttribute(points,tri*3);b.fromBufferAttribute(points,tri*3+1);cornerC.fromBufferAttribute(points,tri*3+2);
  const u=Math.sqrt(random()),v=random();transform.position.copy(a).multiplyScalar(1-u).addScaledVector(b,u*(1-v)).addScaledVector(cornerC,u*v);
  transform.position.multiplyScalar(i%3===0?.70:.94);
  const size=.0045+random()*.006;
  transform.scale.set(size*(.72+random()*.4),size*(1.0+random()*.65),size*.72);transform.rotation.set(random()*3,random()*3,random()*3);transform.updateMatrix();
  shards.setMatrixAt(i,transform.matrix);shards.setColorAt(i,new THREE.Color().setScalar(.72+random()*.4));
 }
 shards.computeBoundingSphere();group.add(shards);
 const loader=new THREE.TextureLoader(),filmTex=loader.load(CRYSTAL_BAG_DATA.filmTexture),normalTex=loader.load(CRYSTAL_BAG_DATA.normalTexture);filmTex.colorSpace=THREE.SRGBColorSpace;filmTex.anisotropy=8;
 const film=new THREE.Mesh(geometry(CRYSTAL_BAG_DATA.parts[1]),new THREE.MeshPhysicalMaterial({map:filmTex,normalMap:normalTex,normalScale:new THREE.Vector2(.5,.5),color:'#ffffff',transparent:true,opacity:.29,roughness:.2,metalness:0,clearcoat:.5,clearcoatRoughness:.14,depthWrite:false,side:THREE.DoubleSide}));film.name='Supplied wrinkled ziplock film';film.renderOrder=2;group.add(film);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=labelCanvas.height=384;const lc=labelCanvas.getContext('2d');lc.fillStyle='#ffe873';lc.fillRect(0,0,384,384);lc.fillStyle='#fff3a2';lc.fillRect(0,0,384,48);lc.fillStyle='#343523';lc.textAlign='center';lc.font='24px monospace';lc.fillText('PARTIA',192,119);lc.font='bold 63px Georgia';lc.fillText(item.purity.toFixed(1)+'%',192,211);lc.font='18px monospace';lc.fillText('CZYSTOŚĆ',192,260);
 const labelTex=new THREE.CanvasTexture(labelCanvas);labelTex.colorSpace=THREE.SRGBColorSpace;labelTex.anisotropy=8;
 const paper=new THREE.PlaneGeometry(.079,.079,18,18),v=paper.attributes.position;
 for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),corner=Math.max(0,(-x-y-.034)/.045);v.setXYZ(i,x+corner*corner*.005,y+corner*corner*.004,.001+corner*corner*.013+.0006*Math.sin(x*75)*Math.cos(y*70));}paper.computeVertexNormals();
 const note=new THREE.Mesh(paper,new THREE.MeshStandardMaterial({map:labelTex,roughness:.93,side:THREE.DoubleSide}));note.name='Yellow sticky note · '+item.purity.toFixed(1)+'%';note.position.set(.016,-.011,.059);note.rotation.z=-.075;note.renderOrder=3;group.add(note);
 return group;
}
