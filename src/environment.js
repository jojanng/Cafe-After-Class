import {FLOOR_BOUNDS,SHAPES} from './placement-model.js';
// Persisted layout IDs are independent of Three.js objects and shop catalogue IDs.
export const PAINTS={honey:'#b58045',walnut:'#76543c',sage:'#8b9877',clay:'#b8785c',cream:'#e2d5bd',charcoal:'#383a32'};
export const FLOOR_STYLES=['oak','stone','cream-tile','terracotta'];
export const LAYOUT_ITEMS={
 'reading-table':{name:'Reading table',kind:'furniture',area:'interior',shopItem:'reading-table'},
 'patio-planter':{name:'Patio planter',kind:'furniture',area:'exterior',shopItem:'patio-planter'},
 counter:{name:'Service counter',kind:'counter',area:'interior'},
 'stool-a':{name:'Window stool A',kind:'furniture',area:'interior'},
 'stool-b':{name:'Window stool B',kind:'furniture',area:'interior'},
 bench:{name:'Patio bench',kind:'furniture',area:'exterior'},
 'window-inside':{name:'Interior window',kind:'window',area:'interior'},
 'window-outside':{name:'Exterior window',kind:'window',area:'exterior'},
 'decal-inside':{name:'Interior wall decal',kind:'decal',area:'interior'},
 'decal-outside':{name:'Exterior wall decal',kind:'decal',area:'exterior'}
};
export const freshEnvironment=()=>({version:1,revision:0,items:{
 'reading-table':{x:2.6,z:2.7,rotation:0,color:'honey',placed:false},
 'patio-planter':{x:-5.65,z:-1.8,rotation:0,color:'clay',placed:false},
 counter:{x:.2,z:.65,rotation:0,color:'honey'},
 'stool-a':{x:-3.55,z:-1.25,rotation:0,color:'honey'},'stool-b':{x:-3.55,z:.75,rotation:0,color:'honey'},
 bench:{x:-5.65,z:1.7,rotation:90,color:'sage'},
 'window-inside':{slot:'left',offset:0,color:'charcoal'},'window-outside':{slot:'left',offset:0,color:'charcoal'},
 'decal-inside':{slot:'rear',offset:-2.9,color:'sage'},'decal-outside':{slot:'rear',offset:-1.5,color:'clay'}
},surfaces:{floor:'oak',patio:'stone',wall:'cream',facade:'cream'}});
export function migrateEnvironment(env){const defaults=freshEnvironment();env ||= defaults;if(!env.items || typeof env.items!=='object')throw Error('Invalid saved layout items.');for(const [id,info] of Object.entries(LAYOUT_ITEMS))if(info.shopItem && !env.items?.[id])env.items[id]=defaults.items[id];return env;}
export function validateEnvironment(env,owned=[]) {
 if(!env || env.version!==1 || !Number.isInteger(env.revision) || env.revision<0 || !env.items || !env.surfaces)throw Error('Invalid saved layout.');
 if(Object.keys(env.items).some(id=>!LAYOUT_ITEMS[id]))throw Error('Unknown layout item.');
 const boxes=[];
 for(const [id,info] of Object.entries(LAYOUT_ITEMS)){
  const item=env.items[id];if(!item || !PAINTS[item.color])throw Error('Choose a valid finish.');
  if(item.placed!==undefined && typeof item.placed!=='boolean')throw Error('Invalid placed state.');
  if(id==='counter' && item.placed===false)throw Error('The service counter must stay placed.');
  if(info.shopItem){if(typeof item.placed!=='boolean')throw Error('Choose whether to place the owned furniture.');if(item.placed&&!owned.includes(info.shopItem))throw Error('Buy this furnishing in the shop before placing it.');}
  if(['window','decal'].includes(info.kind)){
   const limit=info.kind==='decal'?3:info.area==='interior'?.5:1.4;
   if(!['left','rear'].includes(item.slot) || !Number.isFinite(item.offset) || Math.abs(item.offset)>limit)throw Error(`${info.name} is outside its wall slots.`);
  }else{
   if(![item.x,item.z].every(Number.isFinite) || ![0,90,180,270].includes(item.rotation))throw Error('Use finite coordinates and quarter turns.');
   if(info.kind==='counter' && ![0,180].includes(item.rotation))throw Error('The service counter supports 0° or 180° to preserve the work aisle.');
   if(item.placed===false)continue;
   let [w,d]=SHAPES[id];
   if(item.rotation%180)[w,d]=[d,w];
   const b={id,area:info.area,x:item.x,z:item.z,w:w/2,d:d/2};const bounds=FLOOR_BOUNDS[info.area];
   if(b.x-b.w<bounds[0] || b.x+b.w>bounds[1] || b.z-b.d<bounds[2] || b.z+b.d>bounds[3])throw Error(`${info.name} must stay on its ${info.area==='interior'?'room floor':'patio'}.`);
   if(boxes.some(a=>a.area===b.area && Math.abs(a.x-b.x)<a.w+b.w+.08 && Math.abs(a.z-b.z)<a.d+b.d+.08))throw Error('Leave space between furniture and the service counter.');
   boxes.push(b);
  }
 }
 for(const area of ['inside','outside']){const w=env.items[`window-${area}`],d=env.items[`decal-${area}`];if(w.placed!==false && d.placed!==false && w.slot===d.slot && Math.abs(w.offset-d.offset)<(area==='inside'?2.65:1.5))throw Error('Move the wall decal clear of the window.');}
 if([env.surfaces.floor,env.surfaces.patio].includes('terracotta')&&!owned.includes('terracotta-tiles'))throw Error('Buy terracotta tiles in the shop before using them.');
 if(!FLOOR_STYLES.includes(env.surfaces.floor)||!FLOOR_STYLES.includes(env.surfaces.patio)||!PAINTS[env.surfaces.wall]||!PAINTS[env.surfaces.facade])throw Error('Choose an available surface finish.');
 return true;
}
export function editEnvironment(state,action){
 if(state.phase==='focus')throw Error('Finish or carry your focus session before decorating.');
 const current=state.environment || freshEnvironment();
 if(action.expectedLayoutRevision!==current.revision)throw Error('Layout changed in another tab. Reopen Decorate to review it.');
 const next=action.type==='layout-undo'?state.environmentUndo:action.environment;
 if(!next)throw Error('There is no saved edit to undo.');validateEnvironment(next,state.economy?.owned);
 const result=structuredClone(state);result.environment=structuredClone(next);result.environment.revision=current.revision+1;
 result.environmentUndo=action.type==='layout-undo'?null:structuredClone(current);return result;
}
