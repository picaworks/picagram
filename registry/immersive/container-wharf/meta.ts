import type { Meta } from "../../../lib/meta";
export const meta:Meta={
  slug:"container-wharf",title:"Container Wharf",category:"immersive",
  description:"A portal crane lifts one broad container between a moored cargo barge and a dock cradle.",
  tags:["pixel","isometric","crane","harbor"],facets:["animated","canvas"],wave:19,release:"pixel-worlds-2026-11-15",
  animated:true,decorative:true,original:true,credits:[],palette:["fg","bg","accent"],
  controls:{
    berth:{type:"select",options:["straight","finger","corner"],label:"Berth layout"},
    stackHeight:{type:"number",min:1,max:3,step:1,label:"Stack height"},
    cycleSeconds:{type:"number",min:16,max:36,step:1,label:"Cycle seconds"},
    paused:{type:"boolean",label:"Pause"},seed:{type:"number",min:1,max:99,step:1,label:"Seed"},
  },
  presets:[
    {name:"River quay",description:"A long shore edge and parallel barge face a low depot and single container stacks.",props:{berth:"straight",stackHeight:1,cycleSeconds:24}},
    {name:"Finger berth",description:"A narrow pier projects beside the barge, with a wider depot behind the crane.",props:{berth:"finger",stackHeight:2,cycleSeconds:28}},
    {name:"Inner harbor",description:"An L shaped quay wraps the water pocket while tall stacks occupy the long arm.",props:{berth:"corner",stackHeight:3,cycleSeconds:32}},
  ],
};
