import type { Meta } from "../../../lib/meta";
export const meta:Meta={
  slug:"freight-siding",title:"Freight Siding",category:"immersive",
  description:"A small locomotive and coupled freight wagons shunt along a rail spur between a loading canopy and an open weighing pad.",
  tags:["pixel","isometric","railway","freight"],facets:["animated","canvas"],wave:19,release:"pixel-worlds-2026-11-15",
  animated:true,decorative:true,original:true,credits:[],palette:["fg","bg","accent"],
  controls:{
    track:{type:"select",options:["straight","elbow","fork"],label:"Track layout"},
    wagons:{type:"number",min:1,max:3,step:1,label:"Wagons"},
    shuntSeconds:{type:"number",min:16,max:36,step:1,label:"Shunt seconds"},
    paused:{type:"boolean",label:"Pause"},seed:{type:"number",min:1,max:99,step:1,label:"Seed"},
  },
  presets:[
    {name:"Mill spur",description:"Three broad wagons follow a long straight rail bed past a low loading canopy.",props:{track:"straight",wagons:3,shuntSeconds:30}},
    {name:"Warehouse bend",description:"Two wagons round a generous quarter turn beside an L shaped retaining bank.",props:{track:"elbow",wagons:2,shuntSeconds:26}},
    {name:"Depot throat",description:"A short train works the selected arm of a connected fork beside a buffered spare track.",props:{track:"fork",wagons:1,shuntSeconds:22}},
  ],
};
