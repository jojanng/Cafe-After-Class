import * as THREE from 'three';
import {oakGrain, paintedMap, windowGlass, finish} from './corner-materials.js';

// One batch of oak faces. UV lengths are in room units so a short offcut keeps the same grain scale.
function darkOakFloor(scene) {
  const positions=[], uvs=[], colors=[], indices=[];
  const xMin=-4.76, xMax=25, zMin=-3.45, zMax=22, pitch=.42, seam=.011;
  let seed=311;
  const random=()=>((seed=seed*16807%2147483647)/2147483647);
  for (let row=0; zMin+row*pitch<zMax; row++) {
    const z=zMin+row*pitch;
    let x=xMin;
    while (x<xMax) {
      const length=Math.min(xMax-x,x===xMin?.75+random()*2.1:2.15+random()*1.65);
      if (length>seam) {
        const x0=x+seam/2, x1=x+length-seam/2, z0=z+seam/2, z1=z+pitch-seam/2;
        const i=positions.length/3, u=random(), v=random();
        positions.push(x0,.013,z0,x0,.013,z1,x1,.013,z1,x1,.013,z0);
        uvs.push(u,v,u,v+.68,u+length/3.2,v+.68,u+length/3.2,v);
        const shade=.78+.27*random();
        for(let k=0;k<4;k++) colors.push(shade,shade*(.96+.025*(row%2)),shade*.95);
        indices.push(i,i+1,i+2,i,i+2,i+3);
      }
      x+=length;
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const grain=oakGrain(1.8);
  grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
  const boards=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#785943',map:grain,vertexColors:true,roughness:.69}));
  boards.receiveShadow=true;scene.add(boards);
  const joints=new THREE.Mesh(new THREE.PlaneGeometry(xMax-xMin,zMax-zMin+pitch),finish('#3B2C25'));
  joints.rotation.x=-Math.PI/2;joints.position.set((xMin+xMax)/2,0,(zMin+zMax)/2);joints.receiveShadow=true;scene.add(joints);
}

const windowOpening={x:-4.40,bottom:.91,top:4.70};
const windowBays=[[-2.74,2.45],[2.91,7.10]];
const daylightTravel=new THREE.Vector3(1,-.57,-.36);

// Feathered slices from the upper lights share one draw. Solid props depth-test the shafts.
function windowShafts(scene) {
  const vertices=[],uv=[],indices=[];
  const {x,top}=windowOpening;
  const upperLights=windowBays.flatMap(([z0,z1])=>{
    const middle=(z0+z1)/2;
    return [[z0+.10,middle-.07],[middle+.07,z1-.10]];
  });
  for(const [left,right] of upperLights) {
    for(let layer=0;layer<4;layer++){
      const y=top-.13-layer*.14, length=5.5;
      const start=new THREE.Vector3(x+.18,y,left);
      const end=start.clone().addScaledVector(daylightTravel,length);
      const i=vertices.length/3, width=right-left;
      vertices.push(start.x,start.y,start.z, start.x,start.y,start.z+width,
        end.x,end.y,end.z+width, end.x,end.y,end.z);
      uv.push(0,0,0,1,1,1,1,0);indices.push(i,i+1,i+2,i,i+2,i+3);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);
  const glow=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    vertexShader:`varying vec2 beamUv; void main(){beamUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 beamUv; void main(){
      float sides=smoothstep(0.,.18,beamUv.y)*smoothstep(0.,.18,1.-beamUv.y);
      float falloff=smoothstep(0.,.08,beamUv.x)*(1.-smoothstep(.12,1.,beamUv.x));
      gl_FragColor=vec4(.99,.93,.76,.040*sides*falloff);
      #include <colorspace_fragment>
    }`
  });
  const air=new THREE.Mesh(geo,glow);air.renderOrder=1;scene.add(air);
}

export function createCafeShell(scene) {
  darkOakFloor(scene);
  const plasterMap=paintedMap(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#F6F4EE';ctx.fillRect(0,0,w,h);
    let seed=17;
    for(let i=0;i<3600;i++){
      seed=seed*16807%2147483647;const x=seed%w;seed=seed*16807%2147483647;
      ctx.fillStyle=i%2?'#F1EFE9':'#FAF8F3';ctx.fillRect(x,seed%h,1,1);
    }
  });
  plasterMap.wrapS=plasterMap.wrapT=THREE.RepeatWrapping;
  const plaster=new THREE.MeshStandardMaterial({color:'#FFFFFF',map:plasterMap,roughness:.98});
  const reveal=finish('#D6CABB'), sash=finish('#45484B',.43,.15), sill=finish('#F6F4EE',.55);
  function block(w,h,d,mat,x,y,z) {
    const geometry=new THREE.BoxGeometry(w,h,d);
    if(mat===plaster) {
      const {position,normal,uv}=geometry.attributes;
      for(let i=0;i<position.count;i++) {
        const across=Math.abs(normal.getX(i))>.5?z+position.getZ(i):x+position.getX(i);
        uv.setXY(i,across/1.8,(y+position.getY(i))/1.8);
      }
    }
    const m=new THREE.Mesh(geometry,mat);
    m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);
  }
  const {x,bottom,top}=windowOpening;
  const z0=windowBays[0][0], z1=windowBays.at(-1)[1], center=(z0+z1)/2, span=z1-z0;
  // A second bay comes into view on wide screens. Both look onto one continuous courtyard.
  block(30,14,.24,plaster,10.36,7,-3.24);
  block(30,.11,.045,finish('#8B786B'),10.36,.055,-3.092);
  block(.36,14,25-z1,plaster,x,7,(25+z1)/2);
  block(.36,14,z0+3.42,plaster,x,7,(z0-3.42)/2);
  block(.36,bottom,span,plaster,x,bottom/2,center);
  block(.36,14-top,span,plaster,x,(14+top)/2,center);
  const pierStart=windowBays[0][1], pierEnd=windowBays[1][0];
  block(.36,top-bottom,pierEnd-pierStart,plaster,x,(top+bottom)/2,(pierStart+pierEnd)/2);
  // Deep jambs, inset sash and a narrow sill for each opening.
  for(const [start,end] of windowBays) {
    const width=end-start, mid=(start+end)/2;
    block(.67,.085,width+.12,sill,x-.08,bottom,mid);
    block(.60,.085,width+.10,reveal,x-.095,top,mid);
    for(const z of [start,end]) block(.60,top-bottom,.085,reveal,x-.095,(top+bottom)/2,z);
    for(const z of [start+.045,mid,end-.045]) block(.16,top-bottom,.060,sash,x-.12,(top+bottom)/2,z);
    for(const y of [bottom+.065,3.85,top-.055]) block(.16,.055,width,sash,x-.12,y,mid);
  }
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(span+.70,top-bottom+.50),windowGlass());
  glass.rotation.y=Math.PI/2;glass.position.set(x-.39,(top+bottom)/2,center);scene.add(glass);
  const glint=paintedMap(256,256,(ctx,w,h)=>{
    const reflection=ctx.createLinearGradient(0,h,w,0);
    for(const [p,a] of [[0,.025],[.23,.035],[.29,.18],[.32,.025],[.53,.025],[.55,.11],[.6,.035],[1,.045]]) reflection.addColorStop(p,`rgba(255,255,255,${a})`);
    ctx.fillStyle=reflection;ctx.fillRect(0,0,w,h);
  });
  const glazing=new THREE.Mesh(new THREE.PlaneGeometry(span-.09,top-bottom-.1),
    new THREE.MeshBasicMaterial({map:glint,transparent:true,depthWrite:false}));
  glazing.rotation.y=Math.PI/2;glazing.position.set(x-.19,(top+bottom)/2,center);scene.add(glazing);
  windowShafts(scene);

  scene.add(new THREE.HemisphereLight('#EEEFF4','#B7A18F',1.20));
  const roomFill=new THREE.DirectionalLight('#FFF7EA',.70);
  roomFill.position.set(3,4,7);scene.add(roomFill);
  const sun=new THREE.DirectionalLight('#FFE9BF',3.15);
  sun.target.position.set(.15,.6,-.3);
  sun.position.copy(sun.target.position).addScaledVector(daylightTravel,-18);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-14,right:14,top:13,bottom:-11,near:.5,far:48});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.012;sun.shadow.bias=-.00016;sun.shadow.radius=2.5;
  scene.add(sun,sun.target);
}

// One mesh per pleated paper shade instead of individual decorative ribs.
export function paperPendant(scene,x,y,z) {
  const profile=[[.105,.30],[.18,.275],[.43,.11],[.51,-.13],[.49,-.154]], positions=[],colors=[];
  const sectors=64;
  function vertex(index,[radius,h]) {
    const a=index*2*Math.PI/sectors, r=radius*(index%2?.951:1);
    positions.push(r*Math.cos(a),h,r*Math.sin(a));
    const shade=index%2?.86:1;colors.push(shade,shade*.95,shade*.87);
  }
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<sectors;i++){
    for(const [k,n] of [[i,j],[i+1,j],[i,j+1],[i+1,j],[i+1,j+1],[i,j+1]])vertex(k,profile[n]);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const paper=new THREE.MeshStandardMaterial({color:'#f0d4a0',roughness:.92,vertexColors:true,side:THREE.DoubleSide,emissive:'#ffcc84',emissiveIntensity:.12});
  const shade=new THREE.Mesh(geo,paper);shade.position.set(x,y,z);scene.add(shade);
  function piece(rt,rb,h,center,material){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,32),material);m.position.set(x,center,z);scene.add(m);}
  const brass=new THREE.MeshStandardMaterial({color:'#83674f',metalness:.45,roughness:.4});
  const socketTop=y+.374, ceiling=14;
  piece(.011,.011,ceiling-socketTop,(ceiling+socketTop)/2,brass);piece(.10,.105,.085,y+.331,brass);
  piece(.48,.47,.018,y-.15,new THREE.MeshStandardMaterial({color:'#ffebc4',emissive:'#ffd8a3',emissiveIntensity:.46}));
  const light=new THREE.PointLight('#ffcf9b',3,5,2);light.position.set(x,y-.28,z);scene.add(light);
}
