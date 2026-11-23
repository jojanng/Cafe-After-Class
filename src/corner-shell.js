import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {oakGrain} from './corner-materials.js';

// Separate rounded boards in one instanced draw. Swapping finishes reveals the original tile surface.
export function createOakBoards(scene) {
  const width=9, depth=7.4, rows=14, pitch=depth/rows, boards=[];
  const rowStart=[1.35,2.52,.74,1.95];
  for(let row=0;row<rows;row++){
    let start=0;
    while(start<width-.001){
      let length=start===0?rowStart[row%4]:2.93;
      length=Math.min(length,width-start);
      if(width-start-length<.38)length=width-start;
      boards.push({length,x:-width/2+start+length/2,z:-depth/2+(row+.5)*pitch,row});start+=length;
    }
  }
  const geometry=new RoundedBoxGeometry(1,.11,pitch-.009,1,.013);
  const material=new THREE.MeshStandardMaterial({color:'#d8af80',map:oakGrain(),roughness:.72});
  const mesh=new THREE.InstancedMesh(geometry,material,boards.length);
  mesh.receiveShadow=true;
  const pose=new THREE.Object3D(),tone=new THREE.Color();
  boards.forEach(({length,x,z,row},i)=>{
    pose.position.set(x,-.042,z);pose.scale.set(length-.012,1,1);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    tone.setRGB(1,.97,.92).multiplyScalar(.82+.15*(.5+.5*Math.sin(i*14.25+row)));mesh.setColorAt(i,tone);
  });
  scene.add(mesh);return mesh;
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
  piece(.011,.011,3,y+1.84,brass);piece(.10,.105,.085,y+.331,brass);
  piece(.48,.47,.018,y-.15,new THREE.MeshStandardMaterial({color:'#ffebc4',emissive:'#ffd8a3',emissiveIntensity:.46}));
  const light=new THREE.PointLight('#ffcf9b',3,5,2);light.position.set(x,y-.28,z);scene.add(light);
}
