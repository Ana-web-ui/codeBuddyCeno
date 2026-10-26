import type {
  BistroTableConfig,
  RoundTableConfig,
  RoundTableLayout,
} from "./library";

import {
  blenderRoundTables,
  maxRoundTables,
} from "./round-table-exporters";

/**
 * Reutiliza o modelo circular com as medidas do bistrô.
 */
function circularConfig(
  c: BistroTableConfig,
): RoundTableConfig {
  return {
    roundTables: c.bistroTables,
    roundTableCount: c.bistroTableCount,
    roundTableDiameter: c.bistroTableDiameter,
    roundTableHeight: c.bistroTableHeight,
    roundTableTopThickness: c.bistroTableTopThickness,
    roundTableGap: c.bistroTableGap,
    roundTableMat: c.bistroTableMat,
  };
}

/**
 * Separa os nomes dos objetos e da função Python.
 * Assim, mesas redondas e bistrôs podem coexistir.
 */
function identifyBistro(script: string): string {
  return script
    .split("Mesa_Redonda")
    .join("Mesa_Bistro")
    .split("criar_mesas_redondas")
    .join("criar_mesas_bistro")
    .split("MESAS REDONDAS")
    .join("MESAS BISTRO")
    .split("mesas redondas")
    .join("mesas bistro");
}

export function blenderBistroTables(
  c: BistroTableConfig,
  layout: RoundTableLayout,
): string {
  if (!c.bistroTables || layout.positions.length === 0) {
    return "";
  }

  return identifyBistro(
    blenderRoundTables(circularConfig(c), layout),
  );
}

export function maxBistroTables(
  c: BistroTableConfig,
  layout: RoundTableLayout,
): string {
  if (!c.bistroTables || layout.positions.length === 0) {
    return "";
  }

  return identifyBistro(
    maxRoundTables(circularConfig(c), layout),
  );
}