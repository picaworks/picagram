import type { Meta } from "../../../lib/meta";
export const meta:Meta={
  slug:"ridge-cableway",title:"Ridge Cableway",category:"immersive",
  description:"An upright glazed cabin travels on an attached hanger between two hillside terminals along a continuous haul cable.",
  tags:["pixel","isometric","cableway","transport"],facets:["animated","canvas"],wave:19,release:"pixel-worlds-2026-11-15",
  animated:true,decorative:true,original:true,credits:[],palette:["fg","bg","accent"],
  controls:{
    route:{type:"select",options:["ridge","gully","terrace"],label:"Cable route"},
    rise:{type:"number",min:14,max:30,step:1,label:"Station rise"},
    tripSeconds:{type:"number",min:12,max:28,step:1,label:"Round trip seconds"},
    paused:{type:"boolean",label:"Pause"},seed:{type:"number",min:1,max:99,step:1,label:"Seed"},
  },
  presets:[
    {name:"Ridge lift",description:"A steep single cable span rises beside a wedge shaped hill and exposed retained rock face.",props:{route:"ridge",rise:30,tripSeconds:26}},
    {name:"Gully crossing",description:"Two broad banks frame a deep cut, with a stout support above the approach to the upper terminal.",props:{route:"gully",rise:14,tripSeconds:24}},
    {name:"Terrace connector",description:"Two built retaining terraces and exposed terminals frame a short industrial link.",props:{route:"terrace",rise:20,tripSeconds:18}},
  ],
};
