import type { Meta } from "../../../lib/meta";
export const meta:Meta={
  slug:"canal-lock",title:"Canal Lock",category:"immersive",
  description:"A compact canal boat rises and falls with the chamber water between two closed pairs of heavy lock gates.",
  tags:["pixel","isometric","canal","water"],facets:["animated","canvas"],wave:19,release:"pixel-worlds-2026-11-15",
  animated:true,decorative:true,original:true,credits:[],palette:["fg","bg","accent"],
  controls:{
    setting:{type:"select",options:["embankment","stone-cut","side-basin"],label:"Lock setting"},
    lift:{type:"number",min:6,max:14,step:1,label:"Water lift"},
    cycleSeconds:{type:"number",min:18,max:40,step:1,label:"Cycle seconds"},
    paused:{type:"boolean",label:"Pause"},seed:{type:"number",min:1,max:99,step:1,label:"Seed"},
  },
  presets:[
    {name:"Towpath lock",description:"A broad low embankment carries a parallel path and a hut near the lower gates.",props:{setting:"embankment",lift:6,cycleSeconds:26}},
    {name:"Stone cutting",description:"Tall stone banks expose the full lift beneath a narrow upper terrace and keeper's hut.",props:{setting:"stone-cut",lift:14,cycleSeconds:36}},
    {name:"Basin lock",description:"A connected side basin, L shaped towpath and corner retaining wall widen the upper approach.",props:{setting:"side-basin",lift:10,cycleSeconds:30}},
  ],
};
