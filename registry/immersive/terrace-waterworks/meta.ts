import type { Meta } from "../../../lib/meta";
export const meta:Meta={
  slug:"terrace-waterworks",title:"Terrace Waterworks",category:"immersive",
  description:"A submerged radial rake turns beneath a fixed bridge in a round settling tank linked to a pump house and outlet basin.",
  tags:["pixel","isometric","waterworks","infrastructure"],facets:["animated","canvas"],wave:19,release:"pixel-worlds-2026-11-15",
  animated:true,decorative:true,original:true,credits:[],palette:["fg","bg","accent"],
  controls:{
    arrangement:{type:"select",options:["terraced","split-bank","compact"],label:"Works arrangement"},
    tankRadius:{type:"number",min:20,max:30,step:1,label:"Tank radius"},
    turnSeconds:{type:"number",min:20,max:50,step:1,label:"Rake turn seconds"},
    paused:{type:"boolean",label:"Pause"},seed:{type:"number",min:1,max:99,step:1,label:"Seed"},
  },
  presets:[
    {name:"Hillside works",description:"Three stepped plinths descend from the pump house through the tank to a separate low outlet basin.",props:{arrangement:"terraced",tankRadius:26,turnSeconds:40}},
    {name:"Canal intake",description:"A long open service channel divides the pump bank from the settling tank beneath a supported pipe bridge.",props:{arrangement:"split-bank",tankRadius:30,turnSeconds:48}},
    {name:"Town utility",description:"A compact utility platform holds a front tank, raised rear basin and a pump house in its clipped corner.",props:{arrangement:"compact",tankRadius:20,turnSeconds:30}},
  ],
};
