import * as THREE from 'three';
import {PAINTS} from './environment.js';
export function createEnvironmentProjection({scene,serviceParts,drinkOrigins,stools,windows,counterParts,wood,edge,floor,patio,wall,facade}){
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
 const group=(objects,position)=>{const g=new THREE.Group();scene.add(g);g.position.copy(position);scene.updateMatrixWorld(true);for(const obj of objects)g.attach(obj);return g;};
 const service=group(serviceParts,new THREE.Vector3(.2,0,.65));drinkOrigins.forEach(p=>p.sub(new THREE.Vector3(.2,0,.65)));
 const groups={counter:service};const paints={};
 function finish(id,objects){paints[id]=objects.filter(m=>m.material===wood||m.material===edge);paints[id].forEach(m=>m.material=m.material.clone());}
 finish('counter',counterParts);
 for(let i=0;i<stools.length;i++){const id=i?'stool-b':'stool-a';groups[id]=group(stools[i],new THREE.Vector3(-3.55,0,i?.75:-1.25));finish(id,stools[i]);}
 for(const [i,id] of ['window-inside','window-outside'].entries()){groups[id]=group(windows[i],new THREE.Vector3(i?-4.56:-4.2,0,-.25));paints[id]=windows[i].filter(m=>m.geometry.parameters.height<.15 || m.geometry.parameters.depth<.1);paints[id].forEach(m=>m.material=m.material.clone());}
 const bench=new THREE.Group();scene.add(bench);groups.bench=bench;paints.bench=[];
 function block(g,w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 paints.bench.push(block(bench,1.45,.12,.65,0,.6,0,'#8b9877'),block(bench,1.45,.5,.09,0,.94,-.28,'#8b9877'));
 for(const x of [-.55,.55])block(bench,.09,.6,.5,x,.28,0,'#383a32');
 const decalMaterials={};
 for(const id of ['decal-inside','decal-outside']){const g=new THREE.Group();scene.add(g);groups[id]=g;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.clearRect(0,0,128,128);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(64,50,26,0,Math.PI*2);ctx.fill();ctx.fillRect(38,50,52,45);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshStandardMaterial({color:'#8b9877',map:t,roughness:1,transparent:true});decalMaterials[id]=m;const art=new THREE.Mesh(new THREE.PlaneGeometry(.85,1),m);art.position.z=.03;g.add(art);}
 const textures=new Map();function texture(style){if(textures.has(style))return textures.get(style);const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle={oak:'#c8a574',stone:'#c4b59b','cream-tile':'#e7dbc4'}[style];ctx.fillRect(0,0,128,128);ctx.strokeStyle=style==='oak'?'#a58a62':'#ad9f88';ctx.lineWidth=2;ctx.strokeRect(0,0,128,style==='oak'?32:128);if(style==='oak')for(let y=64;y<128;y+=32)ctx.strokeRect(0,y,128,32);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(style==='oak'?5:9,style==='oak'?4:6);textures.set(style,t);return t;}
 let last='';
 return {service,anchor:()=>service.localToWorld(new THREE.Vector3(1.75,1.98,.5)),target:()=>service.localToWorld(new THREE.Vector3(0,2,0)),apply(env){const encoded=JSON.stringify(env);if(last===encoded)return;last=encoded;
   for(const [id,item] of Object.entries(env.items)){const g=groups[id];if(!g)continue;
    if(id.startsWith('window')){const exterior=id==='window-outside';g.position.set(item.slot==='left'?(exterior?-4.56:-4.2):item.offset,0,item.slot==='left'?-.25+item.offset:(exterior?-3.4:-3.04));g.rotation.y=item.slot==='left'?0:-Math.PI/2;}
    else if(id.startsWith('decal')){const ext=id==='decal-outside';g.position.set(item.slot==='left'?(ext?-4.52:-4.29):item.offset,3.35,item.slot==='left'?item.offset:(ext?-3.34:-3.08));g.rotation.y=item.slot==='left'?(ext?-Math.PI/2:Math.PI/2):(ext?Math.PI:0);decalMaterials[id].color.set(PAINTS[item.color]);}
    else {g.position.set(item.x,0,item.z);g.rotation.y=THREE.MathUtils.degToRad(item.rotation);}
    paints[id]?.forEach(m=>m.material.color.set(PAINTS[item.color]));
   }
   floor.material.map=texture(env.surfaces.floor);floor.material.color.set('#ffffff');floor.material.needsUpdate=true;
   patio.material.map=texture(env.surfaces.patio);patio.material.color.set('#ffffff');patio.material.needsUpdate=true;
   wall.color.set(PAINTS[env.surfaces.wall]);facade.color.set(PAINTS[env.surfaces.facade]);
 }};
}
