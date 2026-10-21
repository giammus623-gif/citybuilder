/** Appendix C: the plastico palette. Saturated colours only carry meaning. */
export const PLASTICO = {
  gesso: 0xf2efe9,
  sabbia: 0xe4dccd,
  crema: 0xede6d8,
  grigioCaldo: 0xb9b2a6,
  legnoChiaro: 0xd8c3a0,
  strada: 0xc6bfb4,
  acqua: 0xa9c3d6,
  salvia: 0x9fb29a,
  ombra: 0x5e5850,
} as const;

export const ACCENTI = {
  polizia: 0xd9443a,
  emergenza: 0x3c7ddb,
  economia: 0xe2a33b,
  agenti: 0x33c6c9,
  agricoltura: 0x6fa35a,
  criminalita: 0x8a4fb8,
} as const;

/** Building body tints, all inside the plaster family. */
export const BODY_TINTS = [
  0xf2efe9, 0xede6d8, 0xe4dccd, 0xefe9df, 0xe8e1d4, 0xf5f2ec, 0xddd5c6, 0xe9e3d9,
];
