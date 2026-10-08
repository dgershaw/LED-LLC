/* LBI family site: variant data + interactive bar stage.
   All product facts come from the spec sheets in assets/docs (revision dates noted per variant).
   Palette + and Palette X have no spec sheet yet: their values are marked pending. */
(function () {
  "use strict";

  const PALETTE_COLORS = {
    red:    { name: "Red",    hex: "#ff2a1a", note: "Used for reducing eye strain, increasing biological stimulation or wavelength-specific visibility." },
    orange: { name: "Orange", hex: "#ff7a10", note: "Used for clear signaling, high visibility or wavelength-specific illumination. Measured dominant wavelength 606.3 nm (LBI 65 Color Palette + test report)." },
    amber:  { name: "Amber",  hex: "#ffb000", note: "Used where photochemical sensitivity, glare reduction or wavelength-specific signaling is important." },
    green:  { name: "Green",  hex: "#19e05a", note: "Used where enhanced contrast sensitivity, visual clarity or precise color rendering is required." },
    blue:   { name: "Blue",   hex: "#2a6bff", note: "Common in applications that create soothing atmospheres, high-contrast visibility or subtle displays." },
    violet: { name: "Violet", hex: "#8a3dff", note: "Used to generate enhanced contrast or dynamic displays and environments." }
  };

  // Each Palette bar carries two colors, chosen with a switch.
  const PALETTE_MODELS = [
    { id: "RO", code: "RED-WC-ORG", colors: ["red", "orange"], lm: { "2": "375–600", "4": "750–1,200" } },
    { id: "AG", code: "AMB-WC-GRN", colors: ["amber", "green"], lm: { "2": "1,175–2,125", "4": "2,350–4,250" } },
    { id: "BV", code: "BLU-WC-VLT", colors: ["blue", "violet"], lm: { "2": "15–300", "4": "30–600" } }
  ];

  const ICON = {
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h5"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
    ies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3"/><path d="M6 15c1.5 3 3.6 5 6 5s4.5-2 6-5"/><path d="M8 12a4 4 0 0 1 8 0"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8.5"/></svg>',
    case: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/></svg>'
  };

  const V = [
    {
      id: "g2", group: "white", name: "LBI G2", short: "G2",
      kind: "Linkable white light bar", glyph: "#fff4e0", profile: "slim",
      tagline: "The everyday workhorse. Up to 160 lumens per watt, with wattage and color temperature you set on site.",
      lead: "The new generation of the Linkable Bar with Internal Driver. A sleek, control-ready bar with a protective housing that links end to end into continuous runs, from offices and break rooms to retail aisles.",
      features: [
        "SuperFLEX: switch between 4 wattages and 6 color temperatures.",
        "Link up to 40 bars (160 ft) from one power feed with seamless connectors or linking cables.",
        "Pass-through 0-10V dimming and auxiliary 12V output, so a whole run dims together.",
        "Simple Lighting Control (in-line microwave or PIR occupancy with daylight harvesting) or Silvair Bluetooth mesh network control.",
        "Mounting clips with rare-earth magnets, plus T-bar, blade, suspended and 45° options.",
        "Suitable for dry and damp locations. UL 1598 fixture or UL 1598C retrofit kit."
      ],
      apps: ["Offices", "Break rooms", "Retail aisles", "Cove and display", "Retrofit of existing fixtures"],
      photos: [["office.jpg", "Open office"], ["breakroom.jpg", "Break room"], ["grocery-aisle.jpg", "Retail aisle"]],
      sizes: { "2": { len: 19.3, watts: [6, 8, 10, 12], lm: [948, 1264, 1580, 1896], def: 0 }, "3": { len: 31.3, watts: [10, 12, 15, 18], lm: [1580, 1896, 2370, 2900], def: 0 }, "4": { len: 43.3, watts: [12, 15, 20, 25], lm: [1896, 2370, 3160, 3950], def: 1 } },
      lmNote: "at 3500K",
      ccts: [2700, 3000, 3500, 4000, 5000, 5700], cctRemoteOnly: [5700], cctDef: 4000,
      pn: (s, w, k) => `RP-LBI-G2-${s}F-${w}W-${k}-WC`,
      specs: [
        ["Efficacy", "Up to 160", "lm/W (light engine)"],
        ["Lumens", "960–4,000", "Across 2, 3 and 4 ft"],
        ["Wattage", "6–25 W", "FlexWatt, 4 settings"],
        ["Color temp", "2700–5700K", "FlexColor, 6 settings"],
        ["CRI", "80+", ""],
        ["Beam", "120°", ""],
        ["Rated life", "50,000 h", "L70"],
        ["Operating temp", "-13°F to 140°F", ""],
        ["Size", "1.2 × 1.2 in", "19.3, 31.3 or 43.3 in long"],
        ["Voltage", "120–277V", "120–347V Canada"]
      ],
      docs: [["Spec sheet", "LBI-G2-Spec-Sheet.pdf", "PDF, 11 pages, rev. 07.28.26"]],
      parts: [["RP-LBI-G2-2F-6W-40K-WC", "2 ft linkable bar, 120–277V", "6/8/10/12 W", "960–1,920"], ["RP-LBI-G2-2F-6W-40K-WC-CN", "2 ft linkable bar, 120–347V (Canada)", "6/8/10/12 W", "960–1,920"], ["RP-LBI-G2-3F-10W-40K-WC", "3 ft linkable bar, 120–277V", "10/12/15/18 W", "1,600–2,400"], ["RP-LBI-G2-3F-10W-40K-WC-CN", "3 ft linkable bar, 120–347V (Canada)", "10/12/15/18 W", "1,600–2,400"], ["RP-LBI-G2-4F-15W-40K-WC", "4 ft linkable bar, 120–277V", "12/15/20/25 W", "1,600–4,000"], ["RP-LBI-G2-4F-15W-40K-WC-CN", "4 ft linkable bar, 120–347V (Canada)", "12/15/20/25 W", "1,600–4,000"]],
      shot: "g2-hero.jpg",
      closeups: [["g2-sensor.jpg", "In-line Silvair Bluetooth sensor"], ["g2-power.jpg", "Incoming power cable with switch"], ["g2-tbar.jpg", "T-bar clip"], ["g2-bracket45.jpg", "45° bracket for cove and display"]],
      cmp: { light: "White, 2700–5700K", watts: "2 ft: 6–12 W · 3 ft: 10–18 W · 4 ft: 12–25 W", lm: "2 ft: 960–1,920 · 3 ft: 1,600–2,400 · 4 ft: 1,600–4,000", control: "On-board switches, IR remote, Silvair", rating: "Dry and damp", eff: "Up to 160 lm/W", best: "Offices, retail, general ambient" }
    },
    {
      id: "lbi65", group: "white", name: "LBI 65", short: "65",
      kind: "Linkable white light bar, IP65 for wet locations", glyph: "#eaf3ff", profile: "wet",
      tagline: "The same linkable system, sealed for wet and outdoor locations. Liquid-tight end caps keep the IP65 rating even with accessories.",
      lead: "An IP65-rated linkable fixture or retrofit kit with a polycarbonate housing over an inner metal structure and heat sink. Built for parking garages, coolers, outdoor canopies, tunnels and walkways.",
      features: [
        "IP65 rated and UL listed for wet locations, with vapor-tight linking.",
        "SuperFLEX: 4 wattages and 6 color temperatures, adjustable with the included remote.",
        "Ships with a waterproof end cap and a 1-way moisture valve already installed.",
        "Liquid-tight conduit adapter and stainless steel aircraft suspension cable available.",
        "IP65 in-line PIR occupancy and daylight sensor, or Silvair Bluetooth sensor and node.",
        "Wet-location emergency LED driver with a hand-replaceable battery pack."
      ],
      apps: ["Parking garages", "Coolers and freezers", "Outdoor canopies", "Tunnels and walkways", "Food processing"],
      photos: [["storefront.jpg", "Outdoor canopy"], ["food-processing.jpg", "Food processing"]],
      sizes: { "2": { len: 20.7, watts: [4, 6, 9, 12], lm: [620, 914, 1372, 1872], def: 1 }, "3": { len: 32.7, watts: [6, 10, 15, 20], lm: [915, 1525, 2288, 2874], def: 1 }, "4": { len: 43.3, watts: [10, 15, 20, 25], lm: [1505, 2258, 3010, 3824], def: 3 } },
      lmNote: "DLC tested at 2700K",
      ccts: [2700, 3000, 3500, 4000, 5000, 5700], cctRemoteOnly: [], cctDef: 4000,
      pn: (s, w, k) => `RP-LBI65-${s}F-${w}W-${k}-WC`,
      specs: [
        ["Ingress", "IP65", "Wet location"],
        ["Efficacy", "Up to 160", "lm/W (light engine)"],
        ["Lumens", "640–4,000", "Across 2, 3 and 4 ft"],
        ["Wattage", "4–25 W", "FlexWatt, 4 settings"],
        ["Color temp", "2700–5700K", "FlexColor, 6 settings"],
        ["CRI", "80+", ""],
        ["Rated life", ">100,000 h", "L70, calculated"],
        ["Operating temp", "-22°F to 122°F", ""],
        ["Size", "1.6 × 1.7 in", "20.7, 32.7 or 43.3 in long"],
        ["In the box", "Remote", "Brackets, SS screws, end cap"]
      ],
      docs: [["Spec sheet", "LBI-65-Spec-Sheet.pdf", "PDF, 12 pages, rev. 07.23.26"]],
      parts: [["RP-LBI65-2F-6W-40K-WC", "2 ft IP65 linkable bar", "4/6/9/12 W", "640–1,920"], ["RP-LBI65-3F-10W-40K-WC", "3 ft IP65 linkable bar", "6/10/15/20 W", "960–2,400"], ["RP-LBI65-4F-25W-40K-WC", "4 ft IP65 linkable bar", "10/15/20/25 W", "1,920–4,000"]],
      shot: "lbi65-hero.jpg",
      closeups: [["lbi65-endcap.jpg", "Waterproof end cap with moisture valve"], ["lbi65-sensor.jpg", "IP65 in-line sensor"], ["lbi65-linking.jpg", "Waterproof linking cable"], ["lbi65-conduit.jpg", "Liquid-tight conduit adapter"]],
      cmp: { light: "White, 2700–5700K", watts: "2 ft: 4–12 W · 3 ft: 6–20 W · 4 ft: 10–25 W", lm: "2 ft: 640–1,920 · 3 ft: 960–2,400 · 4 ft: 1,920–4,000", control: "Included remote, PIR, Silvair", rating: "IP65, wet locations", eff: "Up to 160 lm/W", best: "Garages, coolers, canopies, tunnels" }
    },
    {
      id: "max", group: "white", name: "LBI MAX", short: "MAX",
      kind: "Linkable strip fixture, high lumens for higher ceilings", glyph: "#fffaf0", profile: "max",
      tagline: "More light from the same linkable system. Up to 6,365 lumens from a 4 ft strip, with corner pieces for seamless 90° runs.",
      lead: "A linkable linear strip fixture or retrofit kit for commercial, retail, manufacturing, warehouse and display applications. Wattage and color temperature are set with switches inside the unit.",
      features: [
        "SuperFLEX: switch between 4 wattages and 4 color temperatures.",
        "Right- and left-turn 90° corner pieces. Use four of the same direction to make a square.",
        "Link 20 units at 120VAC or 40 units at 277VAC. Works with all LBI wiring accessories.",
        "Surface mount on wall or ceiling, or suspend with the included V-hooks. Pendant, aircraft cable and in-line brackets available.",
        "Optional emergency battery backup.",
        "Optional built-in microwave occupancy sensor and Silvair-ready configurations."
      ],
      apps: ["Warehouses", "Manufacturing", "Retail", "Grocery and display", "High ceilings"],
      photos: [["warehouse.jpg", "Warehouse"], ["produce.jpg", "Grocery display"]],
      sizes: { "2": { len: 24, watts: [15, 20, 25, 30], lm: null, range: "1,950–3,900", def: 2 }, "4": { len: 48, watts: [30, 35, 40, 48], lm: null, range: "3,997–6,365", def: 3 } },
      lmNote: "",
      ccts: [3000, 3500, 4000, 5000], cctRemoteOnly: [], cctDef: 4000,
      pn: (s, w, k) => `RP-LBIMAX-${s}F-${w}W-${k}-WC`,
      specs: [
        ["Lumens", "Up to 6,365", "4 ft at 48 W"],
        ["Efficacy", "146", "lm/W (light engine)"],
        ["Wattage", "15–48 W", "FlexWatt, 4 settings"],
        ["Color temp", "3000–5000K", "FlexColor, 4 settings"],
        ["Corners", "90°", "Right and left turn, 7–16 W"],
        ["CRI", "80+", ""],
        ["Rated life", ">100,000 h", "L70 calc. · L90 51,000 h"],
        ["Operating temp", "-4°F to 113°F", ""],
        ["Lengths", "24 in · 48 in", ""],
        ["Voltage", "120–277V", ""]
      ],
      docs: [["Spec sheet", "LBI-MAX-Spec-Sheet.pdf", "PDF, 10 pages, rev. 08.25.26"]],
      parts: [["RP-LBIMAX-2F-25W-40K-WC", "2 ft linkable strip", "15/20/25/30 W", "1,950–3,900"], ["RP-LBIMAX-4F-48W-40K-WC", "4 ft linkable strip", "30/35/40/48 W", "3,997–6,365"], ["RP-LBIMAX-LR-16W-40K-WC", "Right-turn 90° corner", "7/10/13/16 W", "910–2,080"], ["RP-LBIMAX-LL-16W-40K-WC", "Left-turn 90° corner", "7/10/13/16 W", "910–2,080"]],
      shot: "max-hero.jpg",
      closeups: [["max-corner.jpg", "Seamless 90° corner piece"], ["max-square.jpg", "Four corners make a square"], ["max-bracket.jpg", "Surface mount linking bracket"], ["max-vhooks.jpg", "Included V-hooks for suspension"]],
      cmp: { light: "White, 3000–5000K", watts: "2 ft: 15–30 W · 4 ft: 30–48 W", lm: "2 ft: 1,950–3,900 · 4 ft: 3,997–6,365", control: "On-board switches, IR remote, Silvair", rating: "Dry and damp", eff: "146 lm/W", best: "Warehouses, manufacturing, high ceilings" }
    },
    {
      id: "palette", group: "color", name: "LBI Color Palette", short: "Palette",
      kind: "Linkable precision wavelength selection light bar", glyph: "linear-gradient(90deg,#ff2a1a,#ff7a10,#ffb000,#19e05a,#2a6bff,#8a3dff)", glyphShadow: "#ff7a10", profile: "slim",
      tagline: "Six precise colors on the bar you already know. Pick the wavelength the job calls for and switch between two colors on site.",
      lead: "Our linkable bar with an internal driver, delivering precision wavelength selection. Each bar carries two colors on a switch: red or orange, amber or green, blue or violet. It uses the same accessories as the regular LBI.",
      features: [
        "Choose from 6 colors: red, orange, amber, green, blue and violet.",
        "Each bar holds 2 colors and 3 wattages with FlexWatt and LBI Color Palette technology, controllable from the remote.",
        "Connect up to 40 from one power feed (30 4 ft units at 120VAC, 40 at 277VAC).",
        "Uses the same accessories as the regular LBI.",
        "Dims to off. Optional sensors and emergency battery backup.",
        "Also offered as the LBI 65 Color Palette + for wet locations (IP65) and NSF-certified applications."
      ],
      apps: ["Labs and clean rooms", "Venues and stages", "Aircraft cabins", "Signaling and safety", "Displays", "Wellness spaces"],
      photos: [["color-red.jpg", "Red"], ["color-orange.jpg", "Orange"], ["color-amber.jpg", "Amber"], ["color-green.jpg", "Green"], ["color-blue.jpg", "Blue"], ["color-violet.jpg", "Violet"]],
      tall: true,
      sizes: { "2": { len: 19.3, watts: [6, 9, 12], def: 0 }, "4": { len: 43.3, watts: [10, 15, 25], def: 2 } },
      specs: [
        ["Colors", "6", "Red, orange, amber, green, blue, violet"],
        ["Per bar", "2 colors", "Selected by switch or remote"],
        ["Wattage", "6–25 W", "FlexWatt, 3 settings"],
        ["Power factor", ">0.9", "<20% THD"],
        ["Beam", "120°", ""],
        ["Dimming", "Dim to off", ""],
        ["Operating temp", "-13°F to 140°F", ""],
        ["Size", "1.2 × 1.2 in", "19.3 in or 43.3 in long"],
        ["Voltage", "120–347V", "347V for Canada"],
        ["Wet locations", "LBI 65 Color Palette +", "IP65 and NSF"]
      ],
      docs: [["Sell sheet", "LBI-Palette-Sell-Sheet.pdf", "PDF, 2 pages"]],
      parts: [["RP-LBI-G2-2F-6W-RED-WC-ORG", "2 ft, red / orange", "6/9/12 W", "375–600"], ["RP-LBI-G2-2F-6W-AMB-WC-GRN", "2 ft, amber / green", "6/9/12 W", "1,175–2,125"], ["RP-LBI-G2-2F-6W-BLU-WC-VLT", "2 ft, blue / violet", "6/9/12 W", "15–300"], ["RP-LBI-G2-4F-25W-RED-WC-ORG", "4 ft, red / orange", "10/15/25 W", "750–1,200"], ["RP-LBI-G2-4F-25W-AMB-WC-GRN", "4 ft, amber / green", "10/15/25 W", "2,350–4,250"], ["RP-LBI-G2-4F-25W-BLU-WC-VLT", "4 ft, blue / violet", "10/15/25 W", "30–600"]],
      shot: "palette-hero-blue.jpg",
      closeups: [["palette-bar-blue.jpg", "Same slim housing as LBI G2, shown in blue", "bar"], ["palette-hero.jpg", "LBI 65 Color Palette +, the IP65 version, in orange", "bar"]],
      cmp: { light: "6 fixed wavelengths, 2 per bar", watts: "2 ft: 6–12 W · 4 ft: 10–25 W", lm: "Varies by color: 15–4,250", control: "On-board switch, remote", rating: "Dry and damp", eff: "Varies by color", best: "Labs, signaling, specialty color" }
    },
    {
      id: "plus", group: "color", name: "LBI Color Palette +", short: "Palette +",
      kind: "Linkable RGBWW light bar: white light and limitless color in one", glyph: "conic", profile: "slim",
      tagline: "White light out of the box. Any color from the remote. One bar does both.",
      lead: "LBI Color Palette + is an LBI G2 that can also mix limitless color. Every bar ships set to white light, with FlexWatt and FlexColor switches identical to LBI G2, so it installs, dims and qualifies for rebates like any white bar. Add the optional RGBWW remote and the same bar becomes a full color tunable fixture. RGBWW means red, green, blue, warm white and cool white LEDs in one bar: any color, and any white from 2700K to 5000K.",
      features: [
        "Ships in white light mode: the DLC-listed, rebate-eligible configuration, set with switches identical to LBI G2.",
        "RGBWW light engine: red, green, blue, warm white and cool white in one bar, for limitless color mixing plus 2700K to 5000K white. Lumen values are for white light.",
        "Color is unlocked with the optional RGBWW remote (RP-REMOTE-RGB-WC, includes holster, sold separately). One remote adjusts every bar on the job.",
        "Link up to 40 bars from one power feed, in 2, 3 and 4 ft lengths.",
        "0-10V dimming to off, sensor ready, Simple or Networked Lighting Controls.",
        "Also offered as LBI 65 Color Palette + for IP65-rated and NSF-certified applications."
      ],
      apps: ["Theaters and cinemas", "Entertainment venues", "Bars and restaurants", "Bridges and facades", "Retail displays", "Houses of worship"],
      photos: [["plus-theater.jpg", "Cinema lobby"], ["plus-bridge.jpg", "Pedestrian bridge"], ["plus-venue.jpg", "Entertainment venue"], ["plus-bar.jpg", "Hotel bar"]],
      sizes: { "2": { len: 19.3, watts: [6, 8, 10, 12], lm: [960, 1280, 1600, 1920], def: 3 }, "3": { len: 31.3, watts: [10, 12, 15, 18], lm: [1600, 1920, 2400, 2880], def: 3 }, "4": { len: 43.3, watts: [12, 15, 20, 25], lm: [1920, 2400, 3200, 4000], def: 3 } },
      lmNote: "white light",
      ccts: [2700, 3000, 3500, 4000, 5000], cctRemoteOnly: [], cctDef: 4000,
      factoryW: { "2": 12, "3": 18, "4": 25 },
      pn: (s) => `RP-LBI-G2-${s}F-${{ "2": 12, "3": 18, "4": 25 }[s]}W-RGBWW-WC`,
      specs: [
        ["Light", "RGBWW", "Red, green, blue, warm white and cool white: 2700–5000K white plus limitless color"],
        ["Lumens", "960–4,000", "White light, across 2, 3 and 4 ft"],
        ["Wattage", "6–25 W", "FlexWatt, 4 settings"],
        ["Efficacy", "160 lm/W", "Light engine, white light"],
        ["Beam", "120°", ""],
        ["Rated life", ">100,000 h", "L70 · L90 51,000 h"],
        ["Operating temp", "-13°F to 140°F", ""],
        ["Dimming", "0-10V to off", "Sensor ready"],
        ["Remote", "RP-REMOTE-RGB-WC", "RGBWW remote with holster, sold separately"],
        ["Warranty", "10 years", ""]
      ],
      docs: [],
      parts: [["RP-LBI-G2-2F-12W-RGBWW-WC", "2 ft, RGBWW (white + color), 120–277V, ships in white mode", "6/8/10/12 W", "960–1,920"], ["RP-LBI-G2-3F-18W-RGBWW-WC", "3 ft, RGBWW (white + color), 120–277V, ships in white mode", "10/12/15/18 W", "1,600–2,880"], ["RP-LBI-G2-4F-25W-RGBWW-WC", "4 ft, RGBWW (white + color), 120–277V, ships in white mode", "12/15/20/25 W", "1,920–4,000"], ["RP-REMOTE-RGB-WC", "RGBWW remote with holster. Optional, sold separately; one remote adjusts every bar", "", ""]],
      partsNote: "Add -CN when ordering 120–347V models. Lumen values are for white CCTs.",
      shot: "palette-hero-rainbow.jpg",
      cmp: { light: "RGBWW: white 2700–5000K + limitless color", watts: "2 ft: 6–12 W · 3 ft: 10–18 W · 4 ft: 12–25 W", lm: "White: 2 ft 960–1,920 · 3 ft 1,600–2,880 · 4 ft 1,920–4,000", control: "Switches for white (as shipped) · optional RGBWW remote for color", rating: "Dry and damp · IP65 version", eff: "160 lm/W (white)", best: "Hospitality, venues, retail, facades" }
    },
    {
      id: "x", group: "color", name: "LBI Color Palette X", short: "Palette X",
      kind: "Linkable RGBWW color tunable light bar with DMX", glyph: "conic", profile: "slim", pending: true,
      tagline: "Full RGBWW color under DMX control. Program scenes, cues and shows from the console your venue already runs.",
      lead: "A linkable RGBWW light bar driven over DMX. Red, green, blue, warm white and cool white each have their own channel, so one bar mixes any color and any white from the console, for venues and installations that need programmed scenes and precise control of every run. Full specifications will be added when the spec sheet is ready.",
      features: [
        "RGBWW light engine: red, green, blue, warm white and cool white.",
        "Two white channels on DMX, warm and cool, so tunable white is programmed like any other color.",
        "DMX control for consoles, show controllers and building systems.",
        "Built on the linkable LBI bar with an internal driver, in 2 ft and 4 ft.",
        "Spec sheet, DMX channel map, IES files and installation instructions are coming soon."
      ],
      apps: ["Venues and stages", "Architectural facades", "Theme and attractions", "Broadcast", "Arenas"],
      photos: [],
      sizes: { "2": { len: 19.3 }, "4": { len: 43.3 } },
      specs: [["Color", "RGBWW", "Red, green, blue, warm white, cool white"], ["Control", "DMX", "Separate warm white and cool white channels"], ["Lengths", "2 ft · 4 ft", ""], ["Spec sheet", "Coming soon", ""]],
      docs: [],
      shot: "palette-hero-rainbow.jpg",
      cmp: { light: "RGBWW: full color + tunable white", watts: "Pending spec sheet", lm: "Pending spec sheet", control: "DMX console · RGBWW channels", rating: "Pending spec sheet", eff: "Pending spec sheet", best: "Venues, shows, architectural" }
    },
    {
      id: "palette65", group: "color", name: "LBI 65 Color Palette +", short: "LBI 65 Color Palette +",
      kind: "IP65 linkable precision wavelength light bar, set by remote", glyph: "linear-gradient(90deg,#ff2a1a,#ff7a10,#ffb000,#19e05a,#2a6bff,#8a3dff)", glyphShadow: "#ff7a10", profile: "wet",
      tagline: "The LBI Color Palette, sealed for wet locations. The same six colors, set with the included remote.",
      lead: "An IP65-rated linkable LED bar with an internal driver, delivering precision wavelength selection. Liquid-tight end caps and the same seamless, vapor-tight linking as the LBI 65. There are no switches on the bar: each bar carries two colors and four wattages, chosen with the included remote.",
      features: [
        "IP65 rated, with liquid-tight end caps and waterproof linking.",
        "Each bar holds 2 colors and 4 wattages (FlexWatt), set with the included remote.",
        "Offered in the same color pairs as the LBI Color Palette: red or orange, amber or green, blue or violet.",
        "Connect up to 40 from one power feed (30 4 ft units at 120VAC, 40 at 277VAC).",
        "Dims to off. Sensor ready, with optional IP65 PIR or Silvair Bluetooth sensors and an optional wet-location emergency driver.",
        "Ships with a waterproof end cap and 1-way moisture valve installed, plus brackets for 45° and 90° mounting."
      ],
      apps: ["Venues", "Oceanfronts", "Signaling", "High visibility", "Wet and outdoor areas"],
      photos: [],
      sizes: { "2": { len: 20.7, watts: [4, 6, 9, 12], def: 1 }, "4": { len: 43.3, watts: [10, 15, 20, 25], def: 3 } },
      specs: [
        ["Ingress", "IP65", "Wet locations"],
        ["Colors", "6", "Same pairs as LBI Color Palette"],
        ["Per bar", "2 colors", "Set with the remote"],
        ["Wattage", "4–25 W", "FlexWatt, 4 settings"],
        ["Lumens", "375–1,200", "Red / orange, 2 ft and 4 ft"],
        ["Power factor", ">0.9", "<20% THD"],
        ["Beam", "120°", ""],
        ["Dimming", "Dim to off", "Sensor ready"],
        ["Operating temp", "-13°F to 140°F", ""],
        ["Size", "1.6 × 1.7 in", "20.7 in or 43.3 in long"],
        ["Canada", "240–347V", "Canada-only models"],
        ["In the box", "Remote", "Brackets, SS screws, end cap"]
      ],
      docs: [["Spec sheet (red / orange)", "LBI-65-Palette-Red-Orange-Spec-Sheet.pdf", "PDF, 4 pages, rev. 08.31.26"]],
      parts: [["RP-LBI65-2F-6W-RED-WC-ORG", "2 ft IP65, red / orange", "4/6/9/12 W", "375–600"], ["RP-LBI65-4F-25W-RED-WC-ORG", "4 ft IP65, red / orange", "10/15/20/25 W", "750–1,200"]],
      partsNote: "Red / orange part numbers from the spec sheet. Amber / green and blue / violet bars: ask sales for part numbers.",
      shot: "palette-hero.jpg",
      closeups: [["lbi65-endcap.jpg", "Waterproof end cap with moisture valve"], ["lbi65-sensor.jpg", "IP65 in-line sensor"], ["lbi65-linking.jpg", "Waterproof linking cable"], ["lbi65-conduit.jpg", "Liquid-tight conduit adapter"]],
      cmp: { light: "6 fixed wavelengths, 2 per bar", watts: "2 ft: 4–12 W · 4 ft: 10–25 W", lm: "Red / orange: 375–1,200", control: "Included remote (no switches)", rating: "IP65, wet locations", eff: "Varies by color", best: "Venues, oceanfronts, wet-area signaling" }
    }
  ];
  const byId = Object.fromEntries(V.map(v => [v.id, v]));

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const h = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => n.toLocaleString("en-US");
  const kcode = (k) => `${String(k).slice(0, 2)}K`;

  function cctToRgb(k) {   // Tanner Helland approximation
    const t = k / 100; let r, g, b;
    if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
    else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
    const c = (x) => Math.max(0, Math.min(255, Math.round(x)));
    return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
  }
  function hsl(hue, sat = 100, light = 50) { return `hsl(${hue} ${sat}% ${light}%)`; }
  function glyphCss(v) {
    if (v.glyph === "conic") return "linear-gradient(90deg,#ff3355,#ffcc00,#33dd77,#33aaff,#aa55ff,#ff3355)";
    return v.glyph;
  }

  // ---------- state ----------
  const state = {
    id: "g2", size: "4",
    white: {},      // per id: {w: idx, k: cct}
    pal: { model: 0, side: 0, w: 2 },
    p65: { w: null },
    plus: { mode: "white", w: null, k: 4000, on: true, hue: 210, level: 0.85, white: false, rk: 4000, cycle: false },
    dmx: { r: 40, g: 120, b: 255, ww: 0, cw: 0 }
  };
  V.filter(v => v.group === "white").forEach(v => { state.white[v.id] = { w: null, k: v.cctDef }; });

  // ---------- switcher + family stage ----------
  function renderSwitcher() {
    const group = (g, label) => `<div class="sw-group" role="group" aria-label="${label}"><span class="sw-group-label" aria-hidden="true">${label}</span>${
      V.filter(v => v.group === g).map(v => `<button class="sw-btn" data-go="${v.id}" aria-pressed="false"><span class="sw-glyph" style="--g:${glyphCss(v)}${v.glyph === "conic" || v.glyphShadow ? `;--gs:${v.glyphShadow || "#7a6cff"}` : ""}"></span>${h(v.name)}</button>`).join("")
    }</div>`;
    $("#switcher-row").innerHTML = group("white", "White") + '<span class="sw-divider" aria-hidden="true"></span>' + group("color", "Color");
  }
  const FAM_SUB = { g2: "Linkable white bar", lbi65: "IP65 for wet locations", max: "High-lumen strip", palette: "6 precision colors", palette65: "IP65, 6 colors, by remote", plus: "RGBWW: white + color, remote", x: "RGBWW over DMX" };
  function renderFamily() {
    const row = (v) => {
      const cls = v.profile === "max" ? "thick" : v.profile === "wet" ? "wet" : "";
      const extra = v.id === "palette" || v.id === "palette65" ? "spectrum" : v.glyph === "conic" ? "spectrum cycle" : "";
      return `<button class="fam-bar" data-go="${v.id}" data-scroll="1"><span class="mini ${cls} ${extra}" style="--g:${v.glyph === "conic" || v.id === "palette" || v.id === "palette65" ? "#fff" : v.glyph}"></span><span class="name">${h(v.name)}<span class="sub">${FAM_SUB[v.id]}</span></span></button>`;
    };
    $("#fam-white").innerHTML = V.filter(v => v.group === "white").map(row).join("");
    $("#fam-color").innerHTML = V.filter(v => v.group === "color").map(row).join("");
  }

  // ---------- product ----------
  function renderProduct(animate) {
    const v = byId[state.id];
    if (!v.sizes[state.size]) state.size = "4";
    document.querySelectorAll("[data-go]").forEach(b => b.hasAttribute("aria-pressed") && b.setAttribute("aria-pressed", String(b.dataset.go === v.id)));
    const i = V.indexOf(v), prev = V[(i + V.length - 1) % V.length], next = V[(i + 1) % V.length];

    const shot = v.shot
      ? `<img src="assets/img/product/${v.shot}" alt="${h(v.name)} product photo">`
      : v.shotSet
        ? `<div class="shot-set">${v.shotSet.map(c => `<img src="assets/img/product/palette-bar-${c}.jpg" alt="${h(v.name)} in ${c}">`).join("")}</div>`
        : `<div class="shot-ph">Product photo coming soon</div>`;
    $("#product-head").innerHTML = `
      <div class="ph-text">
        <div class="tag"><span class="chip">${v.group === "white" ? "White light" : "Color"}</span>${v.pending ? '<span class="chip pending">Specs coming soon</span>' : ""}</div>
        <h2>${h(v.name)}</h2>
        <p class="tagline">${h(v.tagline)}</p>
        <div class="step-nav">
          <button class="round" data-go="${prev.id}" aria-label="Previous: ${h(prev.name)}">‹</button>
          <button class="round" data-go="${next.id}" aria-label="Next: ${h(next.name)}">›</button>
        </div>
      </div>
      <figure class="shot${v.shotSet ? " is-set" : ""}">${shot}</figure>`;
    $("#stage-room").innerHTML = `
      <div class="wash" id="wash"></div>
      <div class="bar-wrap"><div class="bar profile-${v.profile}" id="bar"><div class="lens"></div></div></div>
      <div class="scale" id="scale"></div>`;
    syncRain(v);
    selectAcc(v.profile === "wet" ? "65" : v.id === "max" ? "max" : "g2");
    renderControls(v);
    renderDetails(v, prev, next);
    renderCompareHighlight();
    if (animate) { ["#product-head", "#details"].forEach(s => { const el = $(s); el.classList.remove("fade"); void el.offsetWidth; el.classList.add("fade"); }); }
  }

  // Popular accessories: one tab each for LBI + LBI G2, LBI 65 and LBI MAX. The open tab follows the variant on the stage.
  // Without the script every panel shows, each under its own heading.
  function selectAcc(key, focus) {
    const acc = document.querySelector("[data-acc]");
    if (!acc) return;
    acc.querySelectorAll('[role="tab"]').forEach((t) => {
      const on = t.id === "acc-t-" + key;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
      if (on && focus) t.focus();
    });
    acc.setAttribute("data-ready", "");
  }
  function initAcc() {
    const acc = document.querySelector("[data-acc]");
    if (!acc) return;
    const tabs = [...acc.querySelectorAll('[role="tab"]')];
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => selectAcc(t.id.slice(6)));
      t.addEventListener("keydown", (e) => {
        let j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
        if (j === null) return;
        e.preventDefault();
        j = (j + tabs.length) % tabs.length;
        selectAcc(tabs[j].id.slice(6), true);
      });
    });
  }

  // LBI 65 is the waterproof bar: while it is selected, water falls on it, beads on the lens and drips off (rain.js)
  let rain = null;
  function syncRain(v) {
    if (rain) { rain.destroy(); rain = null; }
    if (v.profile !== "wet" || !window.LEDRain) return;
    const room = $("#stage-room");
    rain = window.LEDRain.attach(room, () => {
      const b = $("#bar");
      if (!b) return null;
      const r = b.getBoundingClientRect(), o = room.getBoundingClientRect();
      return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
    }, { rate: 40 });
  }

  function sizeSeg() {
    return `<div class="seg" role="group" aria-label="Length">
      ${Object.keys(byId[state.id].sizes).map(s => `<button data-size="${s}" aria-pressed="${state.size === s}">${s} ft</button>`).join("")}</div>`;
  }
  function slide(id, label, opts, idx, hint) {
    return `<div class="ctl slide-ctl"><span class="lbl" id="${id}-l">${label}</span>
      <div class="slide" style="--n:${opts.length};--i:${idx}">
        <div class="slide-track" role="radiogroup" aria-labelledby="${id}-l">
          ${opts.map((o, j) => `<button role="radio" aria-checked="${j === idx}" aria-label="${h(o.aria || o.label)}" data-slide="${id}" data-i="${j}"></button>`).join("")}
          <span class="slide-knob"></span>
        </div>
        <div class="slide-labels">${opts.map((o, j) => `<span class="${j === idx ? "on" : ""}">${o.label}${o.sub ? `<small>${o.sub}</small>` : ""}</span>`).join("")}</div>
      </div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
  }

  // LBI 65 bars have no switches on the bar: wattage, color temperature and color are set with the included remote.
  // The key layout is illustrative; the keys mirror the settings the spec sheet lists.
  function remote65(rows) {
    return `<div class="remote ip65" role="group" aria-label="Included remote">
      <span class="ir" aria-hidden="true"></span>
      ${rows.map(r => `<div class="rgrp"><span class="rlab">${r.label}</span><div class="remote-row" style="--n:${r.keys.length}">${r.keys.map((k, i) =>
        `<button class="rkey k${k.sel ? " sel" : ""}${k.c ? " tint" : ""}"${k.c ? ` style="--c:${k.c}"` : ""} data-r65="${r.key}" data-i="${i}" aria-pressed="${k.sel}" aria-label="${h(k.aria || k.label)}">${h(k.label)}</button>`).join("")}</div></div>`).join("")}
      <div class="brandmark">REMPHOS</div>
    </div>`;
  }
  const REMOTE_NOTE = "No switches on the bar: set it on site with the included remote, or order a factory preset to save install time. Remote layout is illustrative.";

  function renderControls(v) {
    const el = $("#controls");
    $("#sizebar").innerHTML = sizeSeg();
    if (v.id === "lbi65") {
      const sz = v.sizes[state.size], st = state.white[v.id];
      if (st.w == null || st.w >= sz.watts.length) st.w = sz.def;
      el.innerHTML = `<div class="remote-layout">
        ${remote65([
          { key: "watt", label: "FlexWatt", keys: sz.watts.map((w, i) => ({ label: `${w}W`, sel: i === st.w })) },
          { key: "cct", label: "FlexColor", keys: v.ccts.map(k => ({ label: `${(k / 1000).toFixed(1).replace(".0", "")}K`, aria: `${k}K`, c: cctToRgb(k), sel: k === st.k })) }])}
        <p class="illus">${REMOTE_NOTE}</p>
      </div>`;
    } else if (v.id === "palette65") {
      const sz = v.sizes[state.size], st = state.p65;
      if (st.w == null || st.w >= sz.watts.length) st.w = sz.def;
      const m = PALETTE_MODELS[state.pal.model], cur = m.colors[state.pal.side];
      el.innerHTML = `<div class="remote-layout">
        ${remote65([
          { key: "color", label: "Color", keys: m.colors.map((c, i) => ({ label: PALETTE_COLORS[c].name, c: PALETTE_COLORS[c].hex, sel: i === state.pal.side })) },
          { key: "watt", label: "FlexWatt", keys: sz.watts.map((w, i) => ({ label: `${w}W`, sel: i === st.w })) }])}
        <div class="ctl-grid">
          <div class="ctl ctl-full"><span class="lbl">Pick a wavelength</span><div class="swatches">
            ${Object.entries(PALETTE_COLORS).map(([k, c]) => `<button class="swatch" style="--c:${c.hex}" data-color="${k}" aria-pressed="${k === cur}" aria-label="${c.name}"></button>`).join("")}
          </div><p class="hint">Bar model: ${PALETTE_MODELS.map((x, j) => j === state.pal.model ? `<b style="color:var(--stage-ink)">${x.colors.map(c => PALETTE_COLORS[c].name).join(" / ")}</b>` : x.colors.map(c => PALETTE_COLORS[c].name).join(" / ")).join(" · ")}</p></div>
          <p class="app-note ctl-full" style="--c:${PALETTE_COLORS[cur].hex}"><span class="tagc">${PALETTE_COLORS[cur].name}.</span> ${h(PALETTE_COLORS[cur].note)}</p>
          <p class="illus ctl-full">${REMOTE_NOTE}</p>
        </div>
      </div>`;
    } else if (v.group === "white") {
      const sz = v.sizes[state.size], st = state.white[v.id];
      if (st.w == null || st.w >= sz.watts.length) st.w = sz.def;
      const kIdx = v.ccts.indexOf(st.k);
      el.innerHTML = `<div class="ctl-grid">
        ${slide("watt", "FlexWatt switch", sz.watts.map(w => ({ label: `${w}W` })), st.w)}
        ${slide("cct", "FlexColor switch", v.ccts.map(k => ({ label: `${(k / 1000).toFixed(1).replace(".0", "")}K`, aria: `${k}K`, sub: v.cctRemoteOnly.includes(k) ? "remote" : "" })), kIdx)}
      </div>
      <p class="illus">Set on site with switches on the bar, or order factory preset to save install time.</p>`;
    } else if (v.id === "palette") {
      const sz = v.sizes[state.size]; if (state.pal.w >= sz.watts.length) state.pal.w = sz.def;
      const m = PALETTE_MODELS[state.pal.model];
      const cur = m.colors[state.pal.side];
      el.innerHTML = `<div class="ctl-grid">
        <div class="ctl ctl-full"><span class="lbl">Pick a wavelength</span><div class="swatches">
          ${Object.entries(PALETTE_COLORS).map(([k, c]) => `<button class="swatch" style="--c:${c.hex}" data-color="${k}" aria-pressed="${k === cur}" aria-label="${c.name}"></button>`).join("")}
        </div><p class="hint">Bar model: ${PALETTE_MODELS.map((x, j) => j === state.pal.model ? `<b style="color:var(--stage-ink)">${x.colors.map(c => PALETTE_COLORS[c].name).join(" / ")}</b>` : x.colors.map(c => PALETTE_COLORS[c].name).join(" / ")).join(" · ")}</p></div>
        ${slide("side", "Color switch on the bar", m.colors.map(c => ({ label: PALETTE_COLORS[c].name })), state.pal.side)}
        ${slide("pw", "FlexWatt switch", sz.watts.map(w => ({ label: `${w}W` })), state.pal.w)}
      </div>
      <p class="app-note" style="--c:${PALETTE_COLORS[cur].hex}"><span class="tagc">${PALETTE_COLORS[cur].name}.</span> ${h(PALETTE_COLORS[cur].note)}</p>`;
    } else if (v.id === "plus") {
      const p = state.plus, sz = v.sizes[state.size];
      if (p.w == null || p.w >= sz.watts.length) p.w = sz.def;
      const remoteMode = p.mode === "remote";
      const colors = [["R", 0], ["G", 120], ["B", 230], ["", 30], ["", 55], ["", 90], ["", 165], ["", 190], ["", 210], ["", 275], ["", 300], ["", 330]];
      const names = { 0: "Red", 120: "Green", 230: "Blue", 30: "Orange", 55: "Yellow", 90: "Lime", 165: "Teal", 190: "Cyan", 210: "Azure", 275: "Violet", 300: "Magenta", 330: "Pink" };
      const kIdx = v.ccts.indexOf(p.k);
      el.innerHTML = `
      <div class="plus-note">
        <span class="pn-ic" aria-hidden="true">${ICON.tag}</span>
        <div><b>Ships in white light mode.</b> Every LBI Color Palette + leaves the factory set to white, with FlexWatt and FlexColor switches identical to LBI G2, so it is DLC listed and rebate eligible as installed. Color is unlocked with the optional RGBWW remote <span class="mono">RP-REMOTE-RGB-WC</span>, sold separately. One remote adjusts every bar on the job.</div>
      </div>
      <div class="mode-pills" role="group" aria-label="What is controlling the bar">
        <button class="mode-pill" data-pmode="white" aria-pressed="${!remoteMode}" style="--c:#fff4e0"><i></i>White light via switches <small>as shipped</small></button>
        <button class="mode-pill" data-pmode="remote" aria-pressed="${remoteMode}" style="--c:${hsl(p.hue, 95, 55)}"><i class="${p.white ? "" : "rainbow"}"></i>Color via optional remote</button>
      </div>
      <div class="sub-head"><h4>Optional RGBWW remote</h4><span>RP-REMOTE-RGB-WC, includes holster. One remote for every bar. RGBWW: red, green, blue, warm white and cool white.</span></div>
      <div class="remote-layout">
        <div class="remote rgbww${remoteMode ? " active" : ""}" role="group" aria-label="RGBWW remote control">
          <span class="ir" aria-hidden="true"></span>
          <div class="remote-row">
            <button class="rkey power" data-rk="${p.on && remoteMode ? "off" : "on"}" aria-label="${p.on && remoteMode ? "Off" : "On"}">⏻</button>
            <button class="rkey k${p.cycle ? " sel" : ""}" data-rk="mode" aria-label="Mode: cycle colors">MODE</button>
            <button class="rkey k" data-rk="up" aria-label="Brighter">LM+</button>
            <button class="rkey k" data-rk="down" aria-label="Dimmer">LM−</button>
          </div>
          <div class="remote-row r5">
            ${v.ccts.map(k => `<button class="rkey cct${remoteMode && p.white && p.rk === k ? " sel" : ""}" style="--c:${cctToRgb(k)}" data-rcct="${k}" aria-label="White ${k}K">${(k / 1000).toFixed(1).replace(".0", "")}K</button>`).join("")}
          </div>
          <div class="remote-row">
            ${colors.map(([lab, hue]) => {
              const sel = remoteMode && p.on && !p.white && hue === p.hue && !p.cycle;
              return `<button class="rkey${sel ? " sel" : ""}" style="--c:${hsl(hue, 95, 55)}" data-rhue="${hue}" aria-label="${names[hue]}">${lab}</button>`;
            }).join("")}
          </div>
          <div class="remote-row">
            ${[0.4, 0.6, 0.8, 1].map((lv, n) => `<button class="rkey k${remoteMode && p.level === lv ? " sel" : ""}" data-rpw="${lv}" aria-label="Power preset ${n + 1}">PW${n + 1}</button>`).join("")}
          </div>
          <div class="brandmark">RemPhos · RGBWW</div>
        </div>
        <div class="ctl-grid ctl-stack">
          <div class="ctl"><label for="hue">Fine tune any color</label><input id="hue" class="hue-slider" type="range" min="0" max="359" value="${p.hue}" aria-describedby="hue-hint"><p class="hint" id="hue-hint">Pick a color key or drag the slider: the bar switches from white to color. White keys bring it back to tunable white.</p></div>
          <p class="illus">Interactive preview of the RGBWW remote. The key layout follows the catalog; the spec sheet is the final reference.</p>
        </div>
      </div>
      <div class="sub-head"><h4>Switches on the back of the bar</h4><span>Identical to LBI G2. This is how every LBI Color Palette + ships.</span></div>
      <div class="ctl-grid${remoteMode ? " dimmed" : ""}">
        ${slide("pw2", "FlexWatt switch", sz.watts.map(w => ({ label: `${w}W` })), p.w)}
        ${slide("pk2", "FlexColor switch", v.ccts.map(k => ({ label: `${(k / 1000).toFixed(1).replace(".0", "")}K`, aria: `${k}K` })), kIdx)}
      </div>
      <p class="illus">Factory set to <b>${v.factoryW[state.size]}W · 4000K</b>. Moving a switch sets the white light the bar returns to whenever the remote is not in use.</p>`;
    } else if (v.id === "x") {
      const d = state.dmx, CH = { r: 1, g: 2, b: 3, ww: 4, cw: 5 };   // RGBWW: five channels, two of them white
      const fader = (k, name, col) => `<div class="fader" style="--fc:${col}"><span class="ch">CH ${CH[k]}</span><output id="o-${k}">${String(d[k]).padStart(3, "0")}</output><div class="slot"><input type="range" min="0" max="255" value="${d[k]}" data-fader="${k}" aria-label="${name.replace("<br>", " ")} channel"></div><span class="name">${name}</span></div>`;
      el.innerHTML = `<div class="console" role="group" aria-label="DMX console">
          ${fader("r", "RED", "#ff4a3a")}${fader("g", "GREEN", "#2fe070")}${fader("b", "BLUE", "#3d7bff")}${fader("ww", "WARM<br>WHITE", "#ffc98a")}${fader("cw", "COOL<br>WHITE", "#dbe9ff")}
          <div class="dmx-side">
            <div><span class="lbl">Start address</span><div class="dmx-addr">A.001</div></div>
            <div class="scene-btns" role="group" aria-label="Scenes">
              <button data-scene="255,120,0,160,0">Stage amber</button>
              <button data-scene="0,180,255,0,0">Cyan wash</button>
              <button data-scene="255,0,200,0,0">Magenta</button>
              <button data-scene="0,0,0,255,0">Warm white</button>
              <button data-scene="0,0,0,0,255">Cool white</button>
              <button data-scene="0,0,0,0,0">Blackout</button>
            </div>
          </div>
        </div>
        <p class="illus">Interactive preview with an example 5-channel RGBWW map: red, green, blue, warm white and cool white, each on its own DMX channel. The final personality and channel order come from the LBI Color Palette X spec sheet.</p>`;
    }
    applyLight();
  }

  let cycleTimer = null;
  function tickCycle() {
    const p = state.plus;
    const run = state.id === "plus" && p.mode === "remote" && p.cycle && p.on && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (run && !cycleTimer) cycleTimer = setInterval(() => { state.plus.hue = (state.plus.hue + 2) % 360; const sl = $("#hue"); if (sl) sl.value = state.plus.hue; applyLight(); }, 60);
    if (!run && cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
  }
  function applyLight() {
    tickCycle();
    const v = byId[state.id];
    const room = $("#stage-room"), bar = $("#bar"), sz = v.sizes[state.size];
    const len = sz.len / 48;   // relative to a 4 ft strip
    bar.style.setProperty("--len", `${Math.max(len, 0.36) * 100}%`);
    let color = "#fff", level = 0.7, read = [];
    if (v.group === "white") {
      const st = state.white[v.id];
      color = cctToRgb(st.k);
      level = 0.38 + 0.62 * (st.w / (sz.watts.length - 1));
      const w = sz.watts[st.w];
      const lm = sz.lm ? `≈ ${fmt(sz.lm[st.w])} lm` : `${sz.range} lm range`;
      read = [["Output", `<b>${lm}</b>${sz.lm && v.lmNote ? ` ${v.lmNote}` : ""}`], ["Setting", `<b>${w} W · ${st.k}K</b>`],
              ["Part #", `<span class="mono pn">${v.pn(state.size, w, kcode(st.k))}</span>`]];
    } else if (v.id === "palette65") {
      const m = PALETTE_MODELS[state.pal.model], c = PALETTE_COLORS[m.colors[state.pal.side]], w = state.p65.w ?? sz.def;
      color = c.hex; level = 0.45 + 0.55 * (w / (sz.watts.length - 1));
      const ro = m.id === "RO";
      read = [["Color", `<b style="color:${c.hex}">${c.name}</b>`], ["Setting", `<b>${sz.watts[w]} W</b> by remote`],
              ["Output", ro ? `<b>${m.lm[state.size]} lm</b> for this bar model` : "<b>Lumens with the spec sheet</b>"],
              ["Part #", ro ? `<span class="mono pn">RP-LBI65-${state.size}F-${state.size === "2" ? "6W" : "25W"}-${m.code}</span>` : "<b>Ask sales</b>"]];
    } else if (v.id === "palette") {
      const m = PALETTE_MODELS[state.pal.model], c = PALETTE_COLORS[m.colors[state.pal.side]];
      color = c.hex; level = 0.45 + 0.55 * (state.pal.w / (sz.watts.length - 1));
      read = [["Color", `<b style="color:${c.hex}">${c.name}</b>`], ["Setting", `<b>${sz.watts[state.pal.w]} W</b>`], ["Output", `<b>${m.lm[state.size]} lm</b> for this bar model`],
              ["Part #", `<span class="mono pn">RP-LBI-G2-${state.size}F-${state.size === "2" ? "6W" : "25W"}-${m.code}</span>`]];
    } else if (v.id === "plus") {
      const p = state.plus;
      if (p.mode === "white") {
        color = cctToRgb(p.k);
        level = 0.38 + 0.62 * (p.w / (sz.watts.length - 1));
        const w = sz.watts[p.w];
        read = [["Output", `<b>≈ ${fmt(sz.lm[p.w])} lm</b> white light`], ["Setting", `<b>${w} W · ${p.k}K</b> by switch`], ["Mode", "<b>White light, as shipped</b>"],
                ["Part #", `<span class="mono pn">${v.pn(state.size)}</span>`]];
      } else {
        color = p.white ? cctToRgb(p.rk) : hsl(p.hue, 100, 55);
        level = p.on ? p.level : 0;
        read = [["Color", p.on ? `<b>${p.white ? `White ${p.rk}K` : p.cycle ? "Cycling" : `Hue ${p.hue}°`}</b>` : "<b>Off</b>"], ["Level", `<b>${Math.round(level * 100)}%</b>`], ["Mode", "<b>RGBWW remote</b> (optional)"],
                ["Part #", `<span class="mono pn">${v.pn(state.size)}</span> + <span class="mono pn">RP-REMOTE-RGB-WC</span>`]];
      }
    } else if (v.id === "x") {
      const d = state.dmx, WW = [255, 172, 92], CW = [226, 238, 255];   // additive mix of the five RGBWW channels
      const mix = [d.r, d.g, d.b].map((c, i) => c + d.ww * WW[i] / 255 + d.cw * CW[i] / 255);
      const mx = Math.max(...mix, 1);
      color = `rgb(${mix.map(c => Math.round(c / mx * 255)).join(", ")})`;
      level = Math.min(1, mx / 255);
      read = [["Level", `<b>${Math.round(level * 100)}%</b>`], ["Control", "<b>DMX console</b> · RGBWW"],
              ["DMX R·G·B·WW·CW", `<b class="mono">${[d.r, d.g, d.b, d.ww, d.cw].map(n => String(n).padStart(3, "0")).join(" · ")}</b>`]];
    }
    const off = level <= 0.01;
    room.style.setProperty("--glow", color);
    room.style.setProperty("--level", off ? 0 : Math.max(level, 0.12).toFixed(3));
    bar.classList.toggle("off", off);
    bar.querySelector(".lens").style.setProperty("--lens", off ? "#3a3d45" : `color-mix(in srgb, ${color} 75%, white)`);
    $("#scale").textContent = `${state.size} ft · ${sz.len}" long`;
    $("#readout").innerHTML = read.map(([k, val]) => `<span>${k} ${val}</span>`).join("");
  }

  function resCard(icon, title, meta, href) {
    if (href) return `<a class="res" href="assets/docs/${href}" target="_blank" rel="noopener"><span class="ic">${ICON[icon]}</span><span><h4>${h(title)}</h4><p>${h(meta)}</p><span class="state ready">Available</span></span></a>`;
    return `<div class="res soon"><span class="ic">${ICON[icon]}</span><span><h4>${h(title)}</h4><p>${h(meta)}</p><span class="state soon">Coming soon</span></span></div>`;
  }

  function renderDetails(v, prev, next) {
    const photos = v.photos.length
      ? `<div class="photo-grid${v.tall ? " tall-set" : ""}">${v.photos.map(([f, cap]) => `<figure class="${v.tall ? "tall" : ""}"><img src="assets/img/${f}" alt="${h(v.name)} application: ${h(cap)}" loading="lazy"><figcaption>${h(cap)}</figcaption></figure>`).join("")}</div>`
      : "";
    const docs = v.docs.map(([t, f, m]) => resCard("doc", t, m, f)).join("");
    // what is not published yet is one line, not a wall of empty cards
    const soon = (v.docs.length ? [] : ["spec sheet"]).concat(["installation instructions", "IES files", "videos", "installation photos", "case studies"]);
    const soonText = soon.slice(0, -1).join(", ") + " and " + soon[soon.length - 1];
    const closeups = v.closeups ? `
      <section aria-labelledby="uc-h">
        <div class="section-head"><h3 id="uc-h">Up close</h3><span class="muted" style="font-size:.875rem">From the ${h(v.name)} spec sheet.</span></div>
        <div class="closeups n${v.closeups.length}">${v.closeups.map(([f, cap, cls]) => `<figure><div class="cu-img${cls ? ` ${cls}` : ""}"><img src="assets/img/product/${f}" alt="${h(cap)}" loading="lazy"></div><figcaption>${h(cap)}</figcaption></figure>`).join("")}</div>
      </section>` : "";
    $("#details").innerHTML = `${closeups}
      <section aria-labelledby="ov-h">
        <div class="overview${photos ? "" : " solo"}">
          <div>
            <p class="eyebrow" id="ov-h">${h(v.kind)}</p>
            <p class="lead" style="margin-top:10px">${h(v.lead)}</p>
            <ul class="features">${v.features.map(f => `<li>${h(f)}</li>`).join("")}</ul>
            <div class="apps">${v.apps.map(a => `<span class="chip">${h(a)}</span>`).join("")}</div>
          </div>
          ${photos}
        </div>
      </section>
      <section aria-labelledby="sp-h">
        <div class="section-head"><h3 id="sp-h">At a glance</h3>${v.docs[0] ? `<a href="assets/docs/${v.docs[0][1]}" target="_blank" rel="noopener">Full ${h(v.docs[0][0].toLowerCase())} ›</a>` : ""}</div>
        <div class="spec-tiles" style="--cols:${v.specs.length % 5 === 0 ? 5 : 4}">${v.specs.map(([k, val, n]) => `<div><div class="k">${h(k)}</div><div class="v${/^RP-[A-Z0-9-]+$/.test(val) ? " mono" : ""}">${h(val)}</div>${n ? `<div class="n">${h(n)}</div>` : ""}</div>`).join("")}</div>
      </section>
      <section aria-labelledby="pn-h">
        <div class="section-head"><h3 id="pn-h">Part numbers</h3><span class="muted" style="font-size:.875rem">${v.parts ? (v.partsNote || "Factory default wattage and color shown in the part number. Change on site or order preset.") : ""}</span></div>
        ${v.parts ? `<div class="table-scroll"><table class="parts"><thead><tr><th>Part #</th><th>Description</th><th>Wattage</th><th>Lumens</th></tr></thead><tbody>${v.parts.map(r => `<tr><td class="mono pn" data-label="Part #">${h(r[0])}</td><td class="desc wide" data-label="Description">${h(r[1])}</td>${[["Wattage", r[2]], ["Lumens", r[3]]].map(([lb, x]) => x ? `<td class="nw" data-label="${lb}">${h(x)}</td>` : `<td class="empty" data-label="${lb}">—</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
          : `<div class="res soon" style="grid-template-columns:40px minmax(0,1fr)"><span class="ic">${ICON.tag}</span><span><h4>Ordering information</h4><p>Part numbers will be listed here with the ${h(v.name)} spec sheet.</p><span class="state soon">Coming soon</span></span></div>`}
      </section>
      <section aria-labelledby="rs-h" id="resources">
        <div class="section-head"><h3 id="rs-h">${h(v.name)} resources</h3><span class="muted" style="font-size:.875rem">Everything to spec, quote, install and maintain it.</span></div>
        ${docs ? `<div class="resources">${docs}</div>` : ""}
        <p class="soon-line"><span class="state soon">Coming soon</span><span>${h(soonText.charAt(0).toUpperCase() + soonText.slice(1))}.</span></p>
      </section>
      <nav class="pager" aria-label="Other variants">
        <button data-go="${prev.id}" data-scroll="1"><small>Previous</small><strong>‹ ${h(prev.name)}</strong></button>
        <button data-go="${next.id}" data-scroll="1"><small>Next</small><strong>${h(next.name)} ›</strong></button>
      </nav>`;
  }

  // ---------- compare ----------
  const ROWS = [["Light", "light"], ["Wattage", "watts"], ["Lumens", "lm"], ["Efficacy", "eff"], ["Control", "control"], ["Location", "rating"], ["Best for", "best"]];
  function renderCompare() {
    const head = `<tr><th scope="col"><span class="visually-hidden">Spec</span></th>${V.map(v => `<th scope="col" data-col="${v.id}"><button class="colbtn" data-go="${v.id}" data-scroll="1"><span class="sw-glyph" style="--g:${glyphCss(v)}${v.glyph === "conic" || v.glyphShadow ? `;--gs:${v.glyphShadow || "#7a6cff"}` : ""}"></span><span class="grp">${v.group === "white" ? "White" : "Color"}</span><strong>${h(v.name)}</strong></button></th>`).join("")}</tr>`;
    const body = ROWS.map(([lab, key]) => `<tr><th scope="row">${lab}</th>${V.map(v => `<td data-col="${v.id}" class="${/^Pending/.test(v.cmp[key]) ? "tbd" : ""}">${h(v.cmp[key]).split(" · ").join("<br>")}</td>`).join("")}</tr>`).join("")
      + `<tr><th scope="row">Lengths</th>${V.map(v => `<td data-col="${v.id}">${Object.keys(v.sizes).map(s => `${s} ft`).join(", ")}</td>`).join("")}</tr>`
      + `<tr><th scope="row">Linking</th>${V.map(v => `<td data-col="${v.id}">${v.pending ? "Linkable" : v.id === "max" ? "20 @ 120V · 40 @ 277V" : "Up to 40 from one feed"}</td>`).join("")}</tr>`;
    $("#cmp").innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
    // Phones get one card per variant instead of a 7-column table.
    const cards = $("#cmp-cards");
    if (cards) {
      const facts = v => [...ROWS.map(([lab, key]) => [lab, h(v.cmp[key]).split(" · ").join("<br>")]),
        ["Lengths", Object.keys(v.sizes).map(s => `${s} ft`).join(", ")],
        ["Linking", v.pending ? "Linkable" : v.id === "max" ? "20 @ 120V · 40 @ 277V" : "Up to 40 from one feed"]];
      cards.innerHTML = V.map(v => `<details class="cmp-card" data-col="${v.id}"${v.id === state.id ? " open" : ""}>
        <summary><span class="sw-glyph" style="--g:${glyphCss(v)}"></span><span class="t"><span class="grp">${v.group === "white" ? "White" : "Color"}</span><strong>${h(v.name)}</strong></span><span class="chev" aria-hidden="true">›</span></summary>
        <dl>${facts(v).map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join("")}</dl>
        <button class="btn btn-ghost btn-sm" data-go="${v.id}" data-scroll="1">Open ${h(v.name)}</button>
      </details>`).join("");
    }
  }
  function renderCompareHighlight() {
    document.querySelectorAll("#cmp [data-col]").forEach(c => c.classList.toggle("cur", c.dataset.col === state.id));
    document.querySelectorAll("#cmp-cards [data-col]").forEach(c => { const cur = c.dataset.col === state.id; c.classList.toggle("cur", cur); c.open = cur; });
  }

  // ---------- finder ----------
  const finder = { light: null, need: null };
  const NEEDS = {
    white: [["g2", "Indoor, dry or damp", "Offices, retail, schools, back of house"], ["lbi65", "Wet, outdoor or washdown", "Garages, coolers, canopies, tunnels"], ["max", "High ceilings, more lumens", "Warehouses, manufacturing, big box retail"]],
    color: [["palette", "One exact color, indoors", "Pick 1 of 6 wavelengths, set on the bar"], ["plus", "White now, any color later", "Ships in white mode; RGBWW color with the optional remote"], ["x", "Any color, programmed shows", "RGBWW over DMX, with warm and cool white channels"], ["palette65", "One exact color, wet locations", "IP65; pick 1 of 6 wavelengths, set with the remote"]]
  };
  function renderFinder() {
    const opt = (key, val, title, sub) => `<button class="opt" data-f="${key}" data-v="${val}" aria-pressed="${finder[key] === val}"><span class="dot"></span><span><strong>${title}</strong><span>${sub}</span></span></button>`;
    const q2 = finder.light ? NEEDS[finder.light].map(([id, t, s]) => opt("need", id, t, s)).join("") : `<p class="muted" style="font-size:.875rem">Choose white light or color first.</p>`;
    let result = "";
    if (finder.need) {
      const v = byId[finder.need];
      result = `<div class="result"><span class="sw-glyph" style="--g:${glyphCss(v)}"></span><div><h3>${h(v.name)}</h3><p>${h(v.tagline)}</p></div><button class="btn btn-primary" data-go="${v.id}" data-scroll="1">Explore ${h(v.name)}</button></div>`;
    }
    $("#finder").innerHTML = `
      <div class="q"><h3>1. What kind of light does the job need?</h3><div class="opts">
        ${opt("light", "white", "White light", "General illumination, 2700–5700K")}
        ${opt("light", "color", "Color", "Specific wavelengths or RGBWW full color")}
      </div></div>
      <div class="q"><h3>2. ${finder.light === "color" ? "How will the color be chosen?" : "Where is it going?"}</h3><div class="opts">${q2}</div></div>
      ${result}`;
  }

  // ---------- events ----------
  // Switching variants: if the configurator stage is on screen, it stays exactly where it is (the bar
  // must not jump away under the user's hand); from anywhere else the page goes to the new variant's hero.
  function go(id) {
    if (!byId[id]) return;
    const stage = $(".stage"), before = stage.getBoundingClientRect();
    const topEdge = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
    const visible = Math.min(before.bottom, innerHeight) - Math.max(before.top, topEdge);
    const inConfigurator = visible > 120;
    state.id = id;
    renderProduct(true);
    try { history.replaceState(null, "", `#${id}`); } catch (e) { /* sandboxed */ }
    if (inConfigurator) {
      // Hold the stage where it was. If the new controls are shorter and that would leave the stage's
      // end above the viewport, pull it down just enough to keep it in view.
      const after = stage.getBoundingClientRect();
      let target = before.top;
      if (target < topEdge && target + after.height < innerHeight) target = Math.min(topEdge, innerHeight - after.height);
      const d = after.top - target;
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
    } else {
      $("#product").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.dataset.go) { go(t.dataset.go); return; }
    const v = byId[state.id];
    if (t.dataset.size) { state.size = t.dataset.size; renderControls(v); return; }
    if (t.dataset.slide) {
      const i = +t.dataset.i, k = t.dataset.slide;
      if (k === "watt") state.white[v.id].w = i;
      if (k === "cct") state.white[v.id].k = v.ccts[i];
      if (k === "side") state.pal.side = i;
      if (k === "pw") state.pal.w = i;
      if (k === "pw2") { state.plus.w = i; state.plus.mode = "white"; }
      if (k === "pk2") { state.plus.k = v.ccts[i]; state.plus.mode = "white"; }
      renderControls(v);
      const again = document.querySelector(`[data-slide="${k}"][data-i="${i}"]`); if (again) again.focus();
      return;
    }
    if (t.dataset.r65) {
      const i = +t.dataset.i, k = t.dataset.r65;
      if (v.id === "lbi65") { if (k === "watt") state.white.lbi65.w = i; if (k === "cct") state.white.lbi65.k = v.ccts[i]; }
      if (v.id === "palette65") { if (k === "watt") state.p65.w = i; if (k === "color") state.pal.side = i; }
      renderControls(v);
      const again = document.querySelector(`[data-r65="${k}"][data-i="${i}"]`); if (again) again.focus();
      return;
    }
    if (t.dataset.color) {
      const c = t.dataset.color;
      state.pal.model = PALETTE_MODELS.findIndex(m => m.colors.includes(c));
      state.pal.side = PALETTE_MODELS[state.pal.model].colors.indexOf(c);
      renderControls(v); return;
    }
    if (t.dataset.pmode) { state.plus.mode = t.dataset.pmode; if (t.dataset.pmode === "remote") state.plus.on = true; renderControls(v); return; }
    if (t.dataset.rk) {
      const p = state.plus; p.mode = "remote";
      if (t.dataset.rk === "on") p.on = true;
      if (t.dataset.rk === "off") { p.on = false; p.cycle = false; }
      if (t.dataset.rk === "up") { p.on = true; p.level = Math.min(1, +(p.level + 0.15).toFixed(2)); }
      if (t.dataset.rk === "down") p.level = Math.max(0.1, +(p.level - 0.15).toFixed(2));
      if (t.dataset.rk === "mode") { p.on = true; p.white = false; p.cycle = !p.cycle; }
      renderControls(v); return;
    }
    if (t.dataset.rhue) {
      const p = state.plus; p.mode = "remote";
      p.on = true; p.white = false; p.cycle = false; p.hue = +t.dataset.rhue;
      renderControls(v); return;
    }
    if (t.dataset.rcct) {
      const p = state.plus; p.mode = "remote";
      p.on = true; p.white = true; p.cycle = false; p.rk = +t.dataset.rcct;
      renderControls(v); return;
    }
    if (t.dataset.rpw) {
      const p = state.plus; p.mode = "remote"; p.on = true; p.level = +t.dataset.rpw;
      renderControls(v); return;
    }
    if (t.dataset.scene) {
      const [r, g, b, ww, cw] = t.dataset.scene.split(",").map(Number);
      Object.assign(state.dmx, { r, g, b, ww, cw }); renderControls(v); return;
    }
    if (t.dataset.f) {
      finder[t.dataset.f] = t.dataset.v;
      if (t.dataset.f === "light") finder.need = null;
      renderFinder(); return;
    }
    if (t.dataset.copy) {
      const txt = t.dataset.copy;
      const done = () => { t.textContent = "Copied"; setTimeout(() => (t.textContent = "Copy"), 1500); };
      try { navigator.clipboard.writeText(txt).then(done, () => selectText(t.previousElementSibling)); } catch (err) { selectText(t.previousElementSibling); }
    }
  });
  function selectText(el) { if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "hue") { const p = state.plus; p.hue = +t.value; p.white = false; p.on = true; p.cycle = false; if (p.mode !== "remote") { p.mode = "remote"; renderControls(byId[state.id]); } else { applyLight(); document.querySelectorAll(".rkey.sel").forEach(k => k.classList.remove("sel")); } }
    if (t.dataset.fader) { const k = t.dataset.fader; state.dmx[k] = +t.value; $(`#o-${k}`).textContent = String(t.value).padStart(3, "0"); applyLight(); }
  });

  // Keyboard: arrow keys move between options of a slide switch.
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!t.dataset || !t.dataset.slide || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const sib = t.parentElement.querySelectorAll("button");
    const n = Math.max(0, Math.min(sib.length - 1, +t.dataset.i + (e.key === "ArrowRight" ? 1 : -1)));
    e.preventDefault(); sib[n].click();
  });

  // ---------- boot ----------
  renderSwitcher();
  renderFamily();
  renderCompare();
  renderFinder();
  initAcc();
  const fromHash = (location.hash || "").slice(1);
  state.id = byId[fromHash] ? fromHash : "g2";
  renderProduct(false);
  window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (byId[id] && id !== state.id) go(id); });
})();
