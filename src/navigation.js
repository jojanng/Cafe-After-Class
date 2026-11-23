import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createNavigation({camera,canvas,draw,quietTarget=()=>new THREE.Vector3(0,2,.25)}) {
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=false;controls.enabled=false;controls.minDistance=5;controls.maxDistance=24;
  controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.49;
  controls.maxTargetRadius=5;controls.screenSpacePanning=true;
  let exploring=false,editing=false,focus=false,view='interior',lastDemo;
  const toggle=document.createElement('button');toggle.id='explore-toggle';toggle.textContent='Look around';
  document.querySelector('nav').append(toggle);
  const panel=document.createElement('section');panel.id='camera-tools';panel.hidden=true;panel.setAttribute('aria-label','Camera controls');
  panel.innerHTML='<p>LOOK AROUND</p><div>'+[['interior','Interior'],['exterior','Exterior'],['reset','Reset view'],['left','Look left'],['right','Look right'],['up','Look up'],['down','Look down'],['in','Zoom in'],['out','Zoom out'],['pan-left','Pan left'],['pan-right','Pan right']].map(([id,text])=>`<button type="button" data-camera="${id}">${text}</button>`).join('')+'</div><small>Drag to orbit · right-drag to pan · wheel to zoom.<br>Touch: one finger orbit, two fingers pan/pinch. Keyboard: arrows, +/−; Shift+arrows pan.</small>';
  document.querySelector('main').append(panel);
  canvas.setAttribute('aria-label','Café view. Choose Look around for mouse, touch and keyboard camera controls.');
  function clamp(){controls.target.clamp(new THREE.Vector3(-4,1,-3),new THREE.Vector3(3,3.5,3));}
  function changed(){clamp();draw();}
  controls.addEventListener('change',changed);
  function preset(which='interior'){
    view=which;canvas.dataset.view=view;
    camera.clearViewOffset();camera.fov=canvas.clientWidth<600?46:36;
    if(which==='exterior'){controls.target.set(-1,1.8,-.5);camera.position.set(-12,8,-12);}
    else {controls.target.copy(quietTarget());camera.position.copy(controls.target).add(new THREE.Vector3(8.2,4.3,11.55));}
    camera.updateProjectionMatrix();controls.update();draw();
  }
  function mode(value){exploring=!!value&&!focus;controls.enabled=exploring&&!editing;canvas.style.touchAction=controls.enabled?'none':'auto';canvas.tabIndex=controls.enabled?0:-1;panel.hidden=!exploring;toggle.textContent=exploring?'Return to study view':'Look around';toggle.setAttribute('aria-pressed',String(exploring));document.body.classList.toggle('exploring',exploring);if(!exploring)preset();window.dispatchEvent(new CustomEvent('cafe-navigation',{detail:{exploring,editing,view}}));}
  toggle.onclick=()=>mode(!exploring);
  function move(command){if(!controls.enabled)return;
    if(['interior','exterior'].includes(command))return preset(command);
    if(command==='reset')return preset(view);
    const offset=camera.position.clone().sub(controls.target);const sphere=new THREE.Spherical().setFromVector3(offset);
    if(command==='left')sphere.theta-=.16;if(command==='right')sphere.theta+=.16;
    if(command==='up')sphere.phi-=.1;if(command==='down')sphere.phi+=.1;
    if(command==='in')sphere.radius*=.85;if(command==='out')sphere.radius*=1.15;
    if(command.startsWith('pan-')){const shift=new THREE.Vector3(command==='pan-left'?-.35:.35,0,0).applyQuaternion(camera.quaternion);shift.y=0;controls.target.add(shift);clamp();}
    sphere.radius=THREE.MathUtils.clamp(sphere.radius,5,24);sphere.phi=THREE.MathUtils.clamp(sphere.phi,.25,Math.PI*.49);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere));controls.update();draw();
  }
  panel.onclick=e=>{const button=e.target.closest('[data-camera]');if(button)move(button.dataset.camera);};
  canvas.addEventListener('keydown',e=>{const key={ArrowLeft:e.shiftKey?'pan-left':'left',ArrowRight:e.shiftKey?'pan-right':'right',ArrowUp:'up',ArrowDown:'down','+':'in','=':'in','-':'out',Home:'reset'}[e.key];if(key&&controls.enabled){e.preventDefault();move(key);}});
  window.addEventListener('cafe-state',({detail})=>{focus=detail.phase==='focus';toggle.disabled=focus;if(focus || (lastDemo!==undefined && lastDemo!==detail.demo))mode(false);lastDemo=detail.demo;});
  return {resize(){if(!exploring)preset();else{camera.clearViewOffset();camera.updateProjectionMatrix();controls.update();draw();}},setEditing(value){editing=value;mode(value||exploring);},setView:preset,quiet(){mode(false);},explore(){mode(true);}};
}
