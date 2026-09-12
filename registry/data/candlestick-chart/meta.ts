import type { Meta } from "../../../lib/meta";

export const meta: Meta = {
  slug: "candlestick-chart",
  title: "Candlestick Chart",
  category: "data",
  description: "Price series drawn as hollow or filled candles, with high and low wicks, from RFC 3339 timestamps and OHLC data.",
  tags: ["chart", "candlestick", "price", "ohlc", "financial", "svg", "glyph grid", "data table"],
  facets: ["static", "chart"],
  wave: 4,
  animated: false,
  decorative: false,
  controls: {
    data: { type: "json" },
    label: { type: "string" },
    ticks: { type: "number", min: 2, max: 10, step: 1 },
    width: { type: "number", min: 0.2, max: 0.9, step: 0.1 },
    look: { type: "select", options: ["svg", "glyph"] },
  },
  palette: ["fg", "accent", "muted"],
  credits: [
    {
      relation: "technique",
      title: "Japanese Candlestick Charting Techniques",
      author: "Steve Nison",
      url: "https://lccn.loc.gov/90022736",
      license: "Book",
    },
    {
      relation: "technique",
      title: "Date and Time on the Internet: Timestamps (RFC 3339)",
      author: "G. Klyne and C. Newman",
      url: "https://www.rfc-editor.org/rfc/rfc3339",
      license: "IETF standard",
    },
  ],
};
