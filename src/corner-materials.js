import * as THREE from 'three';

export const finish = (color, roughness=.72, metalness=0) =>
  new THREE.MeshStandardMaterial({color, roughness, metalness});

// All artwork is drawn once at startup. Repeatable grain keeps every saved room consistent.
export function paintedMap(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function oakGrain() {
  return paintedMap(512, 128, (ctx, width, height) => {
    ctx.fillStyle = '#fff7e9';
    ctx.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 1.68 + .67 * Math.cos(y)) {
      ctx.strokeStyle = `rgba(86,52,31,${.032 + .115 * Math.cos(y * .46) ** 4})`;
      ctx.lineWidth = .7 + .9 * Math.sin(y * 7) ** 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const swell = 5 * Math.sin(x / 85 + y / 24) + 16 * Math.exp(-(((x - 135) / 65) ** 2 + ((y - 78) / 22) ** 2));
        ctx.lineTo(x, y + swell);
      }
      ctx.stroke();
    }
  });
}

// Fine, nearly straight fibers for the rift-cut veneer on the counter fronts.
export function oakVeneer() {
  const map = paintedMap(384, 512, (ctx, w, h) => {
    ctx.fillStyle = '#FFF9EF';
    ctx.fillRect(0,0,w,h);
    for (let x=-6, i=0; x<w+6; i++) {
      const streak = Math.sin(i*19.73)**2;
      ctx.strokeStyle = `rgba(102,73,50,${.022+.105*streak})`;
      ctx.lineWidth = .65+1.45*Math.sin(i*2.12)**4;
      ctx.beginPath();
      for (let y=0; y<=h; y+=8) {
        const drift = 2.8*Math.sin(y/205+x/37) + .85*Math.sin(y/67+x/18);
        ctx.lineTo(x+drift,y);
      }
      ctx.stroke();
      x += 1.5+2.8*streak;
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

// Frosted view of a neighboring roof and a break in the trees. The sash owns the view.
export function windowGlass() {
  const map = paintedMap(512, 448, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, w / 2, h);
    sky.addColorStop(0, '#94afb2'); sky.addColorStop(.7, '#e1ddc9'); sky.addColorStop(1, '#ede3c9');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.filter = 'blur(3px)';
    ctx.fillStyle = '#b6b9a8'; ctx.fillRect(-10, 245, 180, 210);
    ctx.fillStyle = '#b5a595'; ctx.fillRect(140, 280, 385, 175);
    ctx.fillStyle = '#97978f'; ctx.fillRect(128, 270, 400, 14);
    ctx.fillStyle = '#84908c';
    for (const x of [173, 231, 345, 402]) {
      ctx.fillRect(x, 302, 24, 35);
      ctx.fillRect(x, 365, 24, 35);
    }
    for (const [x,y,r] of [[0,235,59],[70,254,49],[10,290,68],[468,173,93],[411,200,59],[515,243,74]]) {
      ctx.fillStyle = '#8eaa91'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.filter = 'none'; ctx.fillStyle = '#f3eee92a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff16'; ctx.beginPath(); ctx.moveTo(310,0);ctx.lineTo(355,0);ctx.lineTo(150,h);ctx.lineTo(105,h);ctx.fill();
  });
  return new THREE.MeshBasicMaterial({map, color:'#e0e0d5', toneMapped:false});
}

// Two small, original cut-paper still lifes. Large color fields read from the study camera.
export function stillLife(variant) {
  const map = paintedMap(224, 300, (c,w,h) => {
    c.fillStyle = '#f2e5c9'; c.fillRect(0,0,w,h);
    c.translate(16,18); c.beginPath(); c.rect(0,0,192,264); c.clip();
    function ellipse(x,y,rx,ry,color,angle=0) {
      c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();
    }
    if (variant==='fruit') {
      c.fillStyle='#d4b78c';c.fillRect(0,0,192,264);
      c.fillStyle='#e7d6b0';c.fillRect(0,182,192,90);
      ellipse(101,202,71,10,'#ba9b76');ellipse(118,157,48,41,'#ac4932',-.17);ellipse(65,176,37,30,'#dc8445');
      ellipse(112,117,23,8,'#465b48',-.48);ellipse(139,116,17,6,'#627759',.63);
    } else {
      c.fillStyle='#819a89';c.fillRect(0,0,192,264);ellipse(38,44,57,57,'#dfbf8f');
      c.fillStyle='#526f64';c.fillRect(0,184,192,80);ellipse(95,201,62,9,'#40594f');
      c.strokeStyle='#f3e4c6';c.lineWidth=11;c.beginPath();c.ellipse(137,143,24,22,-.35,0,Math.PI*2);c.stroke();
      c.fillStyle='#ebd5af';c.beginPath();c.moveTo(48,118);c.lineTo(145,118);c.quadraticCurveTo(141,201,103,200);c.lineTo(80,200);c.quadraticCurveTo(56,190,48,118);c.fill();ellipse(97,118,48,9,'#f9eacb');ellipse(97,118,40,5,'#654e3d');
    }
  });
  return new THREE.MeshStandardMaterial({map, roughness:1});
}
