// Spatial contract: independent of decorative meshes, raycasting and renderer details.
export const FLOOR_BOUNDS={interior:[-4.1,4.2,-2,3.7],exterior:[-6.8,-4.6,-3,3.25]};
export const FLOOR_STEP=.25, WALL_STEP=.1;
export const SERVICE_ANCHORS={paper:[1.75,1.98,.5],target:[0,2,0]};
export const CATEGORIES=['tables','counters','machines','windows','decals','tiles','plants','seating'];
export const WALL_SHAPES={interior:{window:[4.2,3.8],decal:[.85,1]},exterior:{window:[2.1,2],decal:[.85,1]}};
export const SHAPES={counter:[5.85,2.28,2.05],'stool-a':[.7,.7,.85],'stool-b':[.7,.7,.85],bench:[1.45,.65,1.2],'reading-table':[1.1,.85,.9],'patio-planter':[.65,.65,1.6]};
export const categoryOf=id=>({'reading-table':'tables',counter:'counters','patio-planter':'plants',bench:'seating','stool-a':'seating','stool-b':'seating'}[id] || (id.startsWith('window')?'windows':'decals'));
export const snap=(n,step)=>Math.round(n/step)*step;
export const isWall=info=>['window','decal'].includes(info.kind);
export function surfaceFor(info,item){
 if(!isWall(info))return {type:'floor',area:info.area,step:FLOOR_STEP,bounds:FLOOR_BOUNDS[info.area],height:.065};
 const outside=info.area==='exterior',left=item.slot==='left';
 return {type:'wall',area:info.area,slot:item.slot,step:WALL_STEP,axis:left?'x':'z',plane:left?(outside?-4.58:-4.18):(outside?-3.42:-3.02),bounds:[-3,3,.3,5.3],height:info.kind==='window'?(outside?2.75:2.65):3.35};
}
export function snapMove(info,item,point){
 if(isWall(info))return {...item,offset:Number(snap(point[item.slot==='left'?'z':'x']+(info.kind==='window'&&item.slot==='left'?.25:0),WALL_STEP).toFixed(2))};
 return {...item,x:Number(snap(point.x,FLOOR_STEP).toFixed(2)),z:Number(snap(point.z,FLOOR_STEP).toFixed(2))};
}
export function rotateItem(info,item){return isWall(info)?item:{...item,rotation:(item.rotation+(info.kind==='counter'?180:90))%360};}
