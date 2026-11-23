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

export function oakGrain(contrast=1) {
  return paintedMap(512, 128, (ctx, width, height) => {
    ctx.fillStyle = '#fff7e9';
    ctx.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 1.68 + .67 * Math.cos(y)) {
      ctx.strokeStyle = `rgba(86,52,31,${contrast * (.032 + .115 * Math.cos(y * .46) ** 4)})`;
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

// An original courtyard beyond the recessed glass, painted once in layers of morning haze.
export function windowGlass() {
  const map = paintedMap(1240, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, w / 2, h);
    sky.addColorStop(0, '#A5BCBF'); sky.addColorStop(.61, '#E8E6D6'); sky.addColorStop(1, '#E1D0AC');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // Muted building planes and narrow eaves stay behind the branches.
    function facade(x, y, width, wall, roof) {
      ctx.fillStyle=wall; ctx.fillRect(x,y,width,h-y);
      ctx.fillStyle=roof; ctx.fillRect(x-3,y-4,width+6,6);
      ctx.fillStyle='#E6DCC7'; ctx.fillRect(x-2,y-5,width+4,2);
      for(let bay=x+15; bay<x+width-21; bay+=39) {
        for(let row=y+20; row<h; row+=52) {
          ctx.fillStyle='#9FA9A2'; ctx.fillRect(bay,row,18,27);
          ctx.fillStyle=wall; ctx.fillRect(bay+8,row,2,27);
          ctx.fillStyle='#DED4BB'; ctx.fillRect(bay-2,row+27,22,3);
        }
      }
    }
    ctx.translate(w-640,0);
    facade(-615,313,236,'#C9C0AC','#A6A499');
    facade(-379,333,191,'#D5C7B1','#B1AA99');
    facade(-188,300,178,'#C7C5B4','#A2A896');
    facade(-10,318,220,'#CACAB7','#ABAE9C');
    facade(190,341,185,'#D4BEA8','#AFA79B');
    facade(375,306,276,'#D6C9B4','#A6A49A');

    let seed=174;
    const random=()=>((seed=seed*16807%2147483647)/2147483647);
    function leaves(cx,cy,rx,ry,tones) {
      for(let i=0; i<190; i++) {
        const angle=random()*Math.PI*2, radius=Math.sqrt(random());
        const x=cx+Math.cos(angle)*radius*rx, y=cy+Math.sin(angle)*radius*ry;
        const size=4+random()*12;
        ctx.fillStyle=tones[i%tones.length];
        ctx.beginPath(); ctx.ellipse(x,y,size,size*.61,-.38,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.strokeStyle='#8C8E7D'; ctx.lineCap='round';
    for(const [x,base,tipX,tipY,thickness] of [[-340,h,-362,245,10],[-345,364,-422,265,6],[52,h,47,285,8],[49,400,8,318,4],[48,363,95,294,4],[595,h,578,233,10],[583,316,513,243,5],[580,290,628,211,4]]) {
      ctx.lineWidth=thickness; ctx.beginPath(); ctx.moveTo(x,base); ctx.quadraticCurveTo(x,(base+tipY)/2,tipX,tipY); ctx.stroke();
    }
    const olive=['#92A38B','#AAB6A0','#ABB79F','#BDC2A2'];
    const sunlit=['#ACBBA2','#B9C3A6','#C8C9A4','#CAD0AF'];
    leaves(21,284,88,59,olive); leaves(67,267,66,39,sunlit);
    leaves(590,226,108,77,olive); leaves(530,221,70,46,sunlit); leaves(605,168,82,41,sunlit);
    leaves(-350,249,108,71,olive); leaves(-415,229,76,43,sunlit); leaves(-319,205,80,41,sunlit);
    // Soften the completed painting in one pass before it goes behind the sash.
    const courtyard=document.createElement('canvas');
    courtyard.width=w; courtyard.height=h;
    courtyard.getContext('2d').drawImage(ctx.canvas,0,0);
    ctx.resetTransform();
    ctx.filter='blur(1.9px)'; ctx.drawImage(courtyard,0,0); ctx.filter='none';
  });
  return new THREE.MeshBasicMaterial({map, color:'#F6F4EE', toneMapped:false});
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
