import * as THREE from 'three';
import {LAYOUT_ITEMS} from './environment.js';
import {surfaceFor,isWall,snapMove,SHAPES,WALL_SHAPES} from './placement-model.js';

export function createPlacementControls({scene,camera,canvas,groups,draw,getDraft,select,change,rotate}){
 const ray=new THREE.Raycaster(),point=new THREE.Vector2(),overlay=new THREE.Group();scene.add(overlay);
 let enabled=false,selected=null,gesture=null;const pointers=new Set();
 function clear(){for(const o of [...overlay.children]){o.geometry.dispose();o.material.dispose();overlay.remove(o);}}
 function line(points,color,opacity=1,depthTest=false){const m=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthTest});const o=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),m);o.renderOrder=20;overlay.add(o);}
 function surfacePoint(s,u,v){return s.type==='floor'?[u,s.height,v]:s.axis==='x'?[s.plane,v,u]:[u,v,s.plane];}
 function update(id,valid){selected=id;clear();canvas.dataset.placement=enabled?(valid?'valid':'invalid'):'';delete canvas.dataset.grid;if(!enabled||!id)return draw();const item=getDraft()?.items[id],info=LAYOUT_ITEMS[id];if(!item || item.placed===false)return draw();const s=surfaceFor(info,item),[a,b,c,d]=s.bounds,pts=[];const step=s.step;
  for(let u=Math.ceil(a/step)*step;u<=b+.001;u+=step)pts.push(surfacePoint(s,u,c),surfacePoint(s,u,d));
  for(let v=Math.ceil(c/step)*step;v<=d+.001;v+=step)pts.push(surfacePoint(s,a,v),surfacePoint(s,b,v));
  line(pts,'#c4ab7d',s.type==='wall'?.22:.45,true);canvas.dataset.grid=s.type==='floor'?info.area:`${info.area}-${item.slot}-wall`;
  let corners;
  if(isWall(info)){const center=item.offset-(info.kind==='window'&&item.slot==='left'?.25:0),[w,h]=WALL_SHAPES[info.area][info.kind];corners=[[center-w/2,s.height-h/2],[center+w/2,s.height-h/2],[center+w/2,s.height+h/2],[center-w/2,s.height+h/2]].map(([u,v])=>surfacePoint(s,u,v));}
  else{const [w,d]=SHAPES[id],r=item.rotation*Math.PI/180;corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[item.x+x*Math.cos(r)+z*Math.sin(r),.08,item.z-x*Math.sin(r)+z*Math.cos(r)]);}
  const edges=[];for(let i=0;i<4;i++)edges.push(corners[i],corners[(i+1)%4]);if(!valid)edges.push(corners[0],corners[2],corners[1],corners[3]);line(edges,valid?'#286b40':'#b23926');draw();
 }
 function cast(e){const r=canvas.getBoundingClientRect();point.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld(true);ray.setFromCamera(point,camera);}
 function intersect(e,s){cast(e);const n=s.type==='floor'?new THREE.Vector3(0,1,0):s.axis==='x'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1);return ray.ray.intersectPlane(new THREE.Plane(n,-(s.type==='floor'?0:s.plane)),new THREE.Vector3());}
 function cancel(){if(!gesture)return;const g=gesture;gesture=null;change(g.id,g.before);if(canvas.hasPointerCapture(g.pointer))canvas.releasePointerCapture(g.pointer);}
 canvas.addEventListener('pointerdown',e=>{if(!enabled)return;pointers.add(e.pointerId);if(pointers.size>1){cancel();return;}if(e.button!==0 || !e.isPrimary)return;
  cast(e);const candidates=Object.entries(groups).filter(([id,g])=>g.visible&&getDraft()?.items[id]?.placed!==false);const hits=ray.intersectObjects(scene.children,true).filter(hit=>{if(!hit.object.isMesh)return false;for(let n=hit.object;n;n=n.parent)if(!n.visible||n===overlay)return false;return true;});if(!hits.length)return;let obj=hits[0].object;while(obj&&!candidates.some(([,g])=>g===obj))obj=obj.parent;const id=candidates.find(([,g])=>g===obj)?.[0];if(!id)return;select(id);canvas.focus({preventScroll:true});const item=structuredClone(getDraft().items[id]),surface=surfaceFor(LAYOUT_ITEMS[id],item),start=intersect(e,surface);if(!start)return;gesture={id,before:item,surface,start,pointer:e.pointerId,width:innerWidth,height:innerHeight};canvas.setPointerCapture(e.pointerId);e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{if(!enabled||!gesture||gesture.pointer!==e.pointerId||pointers.size!==1)return;const g=gesture;if(e.pointerType==='mouse'&&e.buttons!==1){cancel();return;}if(g.width!==innerWidth||g.height!==innerHeight){cancel();return;}const p=intersect(e,g.surface);if(!p)return;const i=g.before,info=LAYOUT_ITEMS[g.id];const base=isWall(info)?{x:i.offset,z:i.offset-(info.kind==='window'&&i.slot==='left'?.25:0)}:{x:i.x,z:i.z};change(g.id,snapMove(info,i,{x:base.x+p.x-g.start.x,z:base.z+p.z-g.start.z}));e.preventDefault();});
 window.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(gesture?.pointer===e.pointerId){if(gesture.width!==innerWidth||gesture.height!==innerHeight){cancel();return;}gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}});
 window.addEventListener('pointercancel',e=>{cancel();pointers.delete(e.pointerId);});
 canvas.addEventListener('lostpointercapture',e=>{cancel();pointers.delete(e.pointerId);});
 canvas.addEventListener('contextmenu',e=>{if(enabled)e.preventDefault();});
 canvas.addEventListener('keydown',e=>{if(!enabled||!selected)return;if(e.key.toLowerCase()==='r'){e.preventDefault();rotate();}if(e.key==='Escape')cancel();});
 window.addEventListener('blur',()=>{cancel();pointers.clear();});
 window.addEventListener('resize',()=>{cancel();pointers.clear();});
 return {update,cancel,setEnabled(value){cancel();pointers.clear();enabled=value;overlay.visible=value;canvas.setAttribute('aria-label',value?'Placement scene. Drag a piece to preview, R to rotate. Confirm or cancel using the paper controls. Numeric alternatives are below.':'Café view. Choose Look around for camera controls.');if(!value){clear();delete canvas.dataset.grid;delete canvas.dataset.placement;}draw();}};
}
