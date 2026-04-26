// data.js — fake catalog for the prototype
window.CATALOG = [
  { id: 1,  name: "Aliança Solitário",      cat: "aneis",   material: "ouro-amarelo", stone: "diamante", price: 2890, badge: "Acabou de chegar", best: false },
  { id: 2,  name: "Brinco Linha",           cat: "brincos", material: "prata",        stone: null,        price: 480,  badge: "Mais querida",      best: true  },
  { id: 3,  name: "Colar Gota",             cat: "colares", material: "ouro-branco",  stone: "topázio",   price: 1450, badge: null,                best: false },
  { id: 4,  name: "Pulseira Trama",         cat: "pulseiras", material: "ouro-amarelo", stone: null,      price: 1290, badge: null,                best: true  },
  { id: 5,  name: "Anel Geometria",         cat: "aneis",   material: "rosé",         stone: "água-marinha", price: 1880, badge: "Acabou de chegar", best: false },
  { id: 6,  name: "Brinco Argola Fina",     cat: "brincos", material: "ouro-amarelo", stone: null,        price: 690,  badge: null,                best: true  },
  { id: 7,  name: "Colar Pingente Letra",   cat: "colares", material: "ouro-branco",  stone: null,        price: 980,  badge: null,                best: false },
  { id: 8,  name: "Anel Eternidade",        cat: "aneis",   material: "ouro-amarelo", stone: "diamante",  price: 4290, badge: "Edição limitada",   best: false },
  { id: 9,  name: "Brinco Ear Cuff",        cat: "brincos", material: "prata",        stone: null,        price: 380,  badge: null,                best: false },
  { id: 10, name: "Pulseira Riviera",       cat: "pulseiras", material: "ouro-amarelo", stone: "diamante", price: 3890, badge: null,                best: true  },
  { id: 11, name: "Anel Banda Fosca",       cat: "aneis",   material: "rosé",         stone: null,        price: 990,  badge: null,                best: false },
  { id: 12, name: "Colar Pérola Single",    cat: "colares", material: "ouro-amarelo", stone: "pérola",    price: 1190, badge: null,                best: false },
];

window.CATEGORIES = [
  { slug: "aneis",     label: "Anéis"     },
  { slug: "brincos",   label: "Brincos"   },
  { slug: "colares",   label: "Colares"   },
  { slug: "pulseiras", label: "Pulseiras" },
];

window.MATERIALS = [
  { slug: "ouro-amarelo", label: "Ouro amarelo 18k", swatch: "#B8956A" },
  { slug: "ouro-branco",  label: "Ouro branco 18k",  swatch: "#E5E5E5" },
  { slug: "rosé",         label: "Ouro rosé 18k",    swatch: "#C8A28C" },
  { slug: "prata",        label: "Prata 925",         swatch: "#9AA0A6" },
];

window.STONES = [
  { slug: "diamante",     label: "Diamante" },
  { slug: "topázio",      label: "Topázio"  },
  { slug: "água-marinha", label: "Água-marinha" },
  { slug: "pérola",       label: "Pérola"   },
];

window.formatBRL = (n) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
