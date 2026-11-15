import type { Meta } from "../../../lib/meta";
export const meta:Meta={
  slug:"wind-station",title:"Wind Station",category:"immersive",
  description:"A broad three blade turbine turns above a tapered mast, connected transformer pad and compact service building.",
  tags:["pixel","isometric","wind","energy"],facets:["animated","canvas"],wave:19,release:"pixel-worlds-2026-11-15",
  animated:true,decorative:true,original:true,credits:[],palette:["fg","bg","accent"],
  controls:{
    site:{type:"select",options:["ridge","coastal","service-yard"],label:"Energy site"},
    bladeRadius:{type:"number",min:18,max:28,step:1,label:"Blade radius"},
    turnSeconds:{type:"number",min:10,max:24,step:1,label:"Rotor seconds"},
    paused:{type:"boolean",label:"Pause"},seed:{type:"number",min:1,max:99,step:1,label:"Seed"},
  },
  presets:[
    {name:"Ridge turbine",description:"A tall mast stands on a tapered ridge above the transformer shelf and descending surface conduit.",props:{site:"ridge",bladeRadius:28,turnSeconds:20}},
    {name:"Harbor power",description:"A broad concrete peninsula and sea wall hold the turbine, transformer and service hut.",props:{site:"coastal",bladeRadius:24,turnSeconds:18}},
    {name:"Utility yard",description:"A flat paved yard separates the turbine from an L shaped fenced transformer pad and service hut.",props:{site:"service-yard",bladeRadius:18,turnSeconds:14}},
  ],
};
