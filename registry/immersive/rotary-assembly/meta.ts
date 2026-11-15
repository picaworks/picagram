import type { Meta } from "../../../lib/meta";
export const meta:Meta={
  slug:"rotary-assembly",title:"Rotary Assembly",category:"immersive",
  description:"Four fixed workpieces index around a broad rotary table, pausing beneath a supported assembly press.",
  tags:["pixel","isometric","factory","assembly"],facets:["animated","canvas"],wave:19,release:"pixel-worlds-2026-11-15",
  animated:true,decorative:true,original:true,credits:[],palette:["fg","bg","accent"],
  controls:{
    floorplan:{type:"select",options:["corner","horseshoe","island"],label:"Workshop floorplan"},
    tableRadius:{type:"number",min:18,max:28,step:1,label:"Table radius"},
    cycleSeconds:{type:"number",min:6,max:14,step:1,label:"Cycle seconds"},
    paused:{type:"boolean",label:"Pause"},seed:{type:"number",min:1,max:99,step:1,label:"Seed"},
  },
  presets:[
    {name:"Corner shop",description:"A compact table and rear press sit between two wall ends, a side bench and a goods rack.",props:{floorplan:"corner",tableRadius:18,cycleSeconds:10}},
    {name:"Production bay",description:"Three low walls frame a larger table, side mounted press and separated input and output benches.",props:{floorplan:"horseshoe",tableRadius:24,cycleSeconds:12}},
    {name:"Open machine island",description:"An open chamfered platform holds the broad table, freestanding cabinet and separated service benches.",props:{floorplan:"island",tableRadius:28,cycleSeconds:14}},
  ],
};
