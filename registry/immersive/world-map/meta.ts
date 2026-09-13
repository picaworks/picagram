import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "world-map",
  title: "World Map",
  category: "immersive",
  description: "A world map on the Equal Earth projection, its land an even grid of dots with named places marked.",
  tags: ["map", "world", "projection", "canvas"],
  facets: ["static", "canvas"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    markers: { type: "json" },
    label: { type: "string" },
    pitch: { type: "number", min: 2, max: 12, step: 0.5 },
    dotSize: { type: "number", min: 0.5, max: 3, step: 0.1 },
    ocean: { type: "number", min: 0, max: 1, step: 0.05 },
    coastline: { type: "boolean" },
    graticule: { type: "number", min: 0, max: 45, step: 15 },
    labels: { type: "boolean" },
  },
  palette: ["fg", "accent", "muted"],
  demo: { props: { labels: true } },
  credits: [
    {
      relation: "technique",
      title: "The Equal Earth map projection",
      author: "Bojan Šavrič, Tom Patterson and Bernhard Jenny",
      url: "https://doi.org/10.1080/13658816.2018.1504949",
      license: "Paper",
    },
    {
      relation: "technique",
      title: "Equal Earth, EPSG method 1078",
      author: "IOGP",
      url: "https://epsg.io/1078-method",
      license: "Standard, no code",
    },
    {
      relation: "port-of",
      title: "Natural Earth",
      author: "Tom Patterson and Nathaniel Vaughn Kelso",
      url: "https://www.naturalearthdata.com/about/terms-of-use/",
      license: "Public domain",
    },
  ],
};
