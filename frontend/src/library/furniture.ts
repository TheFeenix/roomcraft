import type { LibraryItem, Part } from "./catalog";

const WOOD = "#a8794a";
const DARK_WOOD = "#6d4a2a";
const METAL = "#8a8f96";
const BLACK = "#1c1c1c";

function table(id: string, name: string, category: string, subcategory: string, width: number, depth: number, height: number, color: string): LibraryItem {
  const top = 0.04;
  const leg = 0.07;
  const legHeight = height - top;
  const lx = width / 2 - leg / 2 - 0.03;
  const lz = depth / 2 - leg / 2 - 0.03;
  return {
    id,
    name,
    category,
    subcategory,
    type: "furniture",
    parts: [
      { size: [width, top, depth], center: [0, height - top / 2, 0], color, main: true },
      { size: [leg, legHeight, leg], center: [-lx, legHeight / 2, -lz], color: DARK_WOOD },
      { size: [leg, legHeight, leg], center: [lx, legHeight / 2, -lz], color: DARK_WOOD },
      { size: [leg, legHeight, leg], center: [-lx, legHeight / 2, lz], color: DARK_WOOD },
      { size: [leg, legHeight, leg], center: [lx, legHeight / 2, lz], color: DARK_WOOD },
    ],
  };
}

function crate(id: string, name: string, width: number, height: number, depth: number): LibraryItem {
  const post = 0.05;
  const band = 0.05;
  const parts: Part[] = [
    { size: [width - 0.02, height - 0.02, depth - 0.02], center: [0, height / 2, 0], color: "#b98a54", main: true },
  ];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push({
        size: [post, height, post],
        center: [(sx * (width - post)) / 2, height / 2, (sz * (depth - post)) / 2],
        color: "#8a6238",
      });
    }
  }
  for (const level of [0.2, 0.5, 0.8]) {
    for (const sz of [-1, 1]) {
      parts.push({ size: [width - post, band, 0.012], center: [0, height * level, (sz * depth) / 2], color: "#9c7040" });
    }
    for (const sx of [-1, 1]) {
      parts.push({ size: [0.012, band, depth - post], center: [(sx * width) / 2, height * level, 0], color: "#9c7040" });
    }
  }
  return { id, name, category: "Almacenaje", subcategory: "Cajas", type: "furniture", parts };
}

function chair(): LibraryItem {
  const leg = 0.04;
  const seatHeight = 0.45;
  const size = 0.42;
  const lx = size / 2 - leg / 2;
  const legHeight = seatHeight - 0.03;
  return {
    id: "chair",
    name: "Silla",
    category: "Comedor",
    subcategory: "Sillas",
    type: "furniture",
    parts: [
      { size: [size, 0.04, size], center: [0, seatHeight, 0], color: WOOD, main: true },
      { size: [size, 0.45, 0.04], center: [0, seatHeight + 0.245, -size / 2 + 0.02], color: WOOD, main: true },
      { size: [leg, legHeight, leg], center: [-lx, legHeight / 2, -lx], color: DARK_WOOD },
      { size: [leg, legHeight, leg], center: [lx, legHeight / 2, -lx], color: DARK_WOOD },
      { size: [leg, legHeight, leg], center: [-lx, legHeight / 2, lx], color: DARK_WOOD },
      { size: [leg, legHeight, leg], center: [lx, legHeight / 2, lx], color: DARK_WOOD },
    ],
  };
}

function sofa(): LibraryItem {
  const width = 2.0;
  const depth = 0.9;
  return {
    id: "sofa",
    name: "Sofa",
    category: "Sala",
    subcategory: "Sofas",
    type: "furniture",
    parts: [
      { size: [width, 0.4, depth], center: [0, 0.2, 0], color: "#4d5a68", main: true },
      { size: [0.9, 0.15, 0.7], center: [-0.45, 0.475, 0.08], color: "#5d6b7a", main: true },
      { size: [0.9, 0.15, 0.7], center: [0.45, 0.475, 0.08], color: "#5d6b7a", main: true },
      { size: [width, 0.45, 0.2], center: [0, 0.625, -depth / 2 + 0.1], color: "#4d5a68", main: true },
      { size: [0.2, 0.25, depth], center: [-width / 2 + 0.1, 0.525, 0], color: "#43505d", main: true },
      { size: [0.2, 0.25, depth], center: [width / 2 - 0.1, 0.525, 0], color: "#43505d", main: true },
    ],
  };
}

function refrigerator(): LibraryItem {
  return {
    id: "refrigerator",
    name: "Refrigerador",
    category: "Cocina",
    subcategory: "Electrodomesticos",
    type: "appliance",
    parts: [
      { size: [0.7, 1.75, 0.7], center: [0, 0.875, 0], color: "#d9dde2", main: true },
      { size: [0.7, 0.012, 0.012], center: [0, 1.2, 0.352], color: "#7c828a" },
      { size: [0.03, 0.4, 0.03], center: [0.28, 1.45, 0.365], color: METAL },
      { size: [0.03, 0.6, 0.03], center: [0.28, 0.75, 0.365], color: METAL },
    ],
  };
}

function oven(): LibraryItem {
  const parts: Part[] = [
    { size: [0.6, 0.9, 0.6], center: [0, 0.45, 0], color: "#cfd2d6", main: true },
    { size: [0.6, 0.02, 0.6], center: [0, 0.91, 0], color: BLACK },
    { size: [0.44, 0.3, 0.012], center: [0, 0.4, 0.306], color: "#14191f" },
    { size: [0.5, 0.025, 0.03], center: [0, 0.68, 0.325], color: METAL },
  ];
  for (const x of [-0.14, 0.14]) {
    for (const z of [-0.14, 0.14]) {
      parts.push({ size: [0.16, 0.01, 0.16], center: [x, 0.925, z], color: "#3a3a3a" });
    }
  }
  for (const x of [-0.2, -0.07, 0.07, 0.2]) {
    parts.push({ size: [0.04, 0.04, 0.025], center: [x, 0.8, 0.31], color: "#2a2a2a" });
  }
  return { id: "oven", name: "Horno con estufa", category: "Cocina", subcategory: "Electrodomesticos", type: "appliance", parts };
}

function kitchenCounter(): LibraryItem {
  return {
    id: "kitchen-counter",
    name: "Meson con fregadero",
    category: "Cocina",
    subcategory: "Muebles de cocina",
    type: "furniture",
    parts: [
      { size: [1.2, 0.86, 0.6], center: [0, 0.43, 0], color: "#d8d2c4", main: true },
      { size: [1.24, 0.04, 0.64], center: [0, 0.88, 0.01], color: "#7d838a" },
      { size: [0.45, 0.012, 0.35], center: [-0.25, 0.906, 0.02], color: "#3c4147" },
      { size: [0.03, 0.22, 0.03], center: [-0.25, 1.01, -0.2], color: METAL },
      { size: [0.03, 0.03, 0.14], center: [-0.25, 1.11, -0.14], color: METAL },
      { size: [0.02, 0.7, 0.012], center: [0.12, 0.43, 0.306], color: "#a39d90" },
    ],
  };
}

function television(): LibraryItem {
  return {
    id: "television",
    name: "Televisor con base",
    category: "Sala",
    subcategory: "Electronica",
    type: "appliance",
    parts: [
      { size: [0.5, 0.03, 0.22], center: [0, 0.015, 0], color: BLACK },
      { size: [0.06, 0.22, 0.05], center: [0, 0.14, 0], color: BLACK },
      { size: [1.1, 0.65, 0.04], center: [0, 0.58, 0], color: BLACK },
      { size: [1.06, 0.61, 0.006], center: [0, 0.58, 0.022], color: "#0d1b2a" },
    ],
  };
}

function floorLamp(): LibraryItem {
  return {
    id: "floor-lamp",
    name: "Lampara de pie",
    category: "Sala",
    subcategory: "Iluminacion",
    type: "lighting",
    parts: [
      { size: [0.3, 0.03, 0.3], center: [0, 0.015, 0], color: "#2b2b2b" },
      { size: [0.03, 1.5, 0.03], center: [0, 0.78, 0], color: "#2b2b2b" },
      { size: [0.38, 0.3, 0.38], center: [0, 1.6, 0], color: "#f3e6c4", main: true },
    ],
  };
}

function bookcase(): LibraryItem {
  const width = 0.8;
  const height = 1.8;
  const depth = 0.3;
  const parts: Part[] = [
    { size: [0.03, height, depth], center: [-width / 2 + 0.015, height / 2, 0], color: WOOD, main: true },
    { size: [0.03, height, depth], center: [width / 2 - 0.015, height / 2, 0], color: WOOD, main: true },
    { size: [width, height, 0.01], center: [0, height / 2, -depth / 2 + 0.005], color: DARK_WOOD },
  ];
  for (const y of [0.015, 0.4, 0.8, 1.2, 1.6, height - 0.015]) {
    parts.push({ size: [width - 0.06, 0.03, depth], center: [0, y, 0], color: WOOD, main: true });
  }
  const bookColors = ["#7b2d26", "#2d4a7b", "#2d7b4a", "#c9a227"];
  [0.43, 0.83, 1.23].forEach((y, row) => {
    bookColors.forEach((color, index) => {
      parts.push({ size: [0.06, 0.28, 0.2], center: [-0.25 + index * 0.1 + row * 0.02, y + 0.14, 0], color });
    });
  });
  return { id: "bookcase", name: "Librero", category: "Almacenaje", subcategory: "Libreros", type: "furniture", parts };
}

function wallShelf(): LibraryItem {
  return {
    id: "wall-shelf",
    name: "Repisa de pared",
    category: "Almacenaje",
    subcategory: "Repisas",
    type: "furniture",
    elevation: 1.5,
    parts: [
      { size: [1.0, 0.04, 0.25], center: [0, 0.02, 0], color: WOOD, main: true },
      { size: [1.0, 0.1, 0.02], center: [0, 0.07, -0.115], color: DARK_WOOD },
    ],
  };
}

export const EXTRA_ITEMS: LibraryItem[] = [
  refrigerator(),
  oven(),
  kitchenCounter(),
  table("kitchen-table", "Mesa de cocina", "Cocina", "Mesas", 0.9, 0.6, 0.9, "#d8c9a8"),
  table("dining-table", "Mesa de comedor", "Comedor", "Mesas", 1.6, 0.9, 0.75, WOOD),
  chair(),
  sofa(),
  table("coffee-table", "Mesa de centro", "Sala", "Mesas", 1.0, 0.5, 0.42, DARK_WOOD),
  television(),
  floorLamp(),
  crate("crate-small", "Caja de madera chica", 0.4, 0.3, 0.4),
  crate("crate-large", "Caja de madera grande", 0.8, 0.6, 0.6),
  bookcase(),
  wallShelf(),
];

