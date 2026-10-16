import type {
  StoolConfig,
  StoolLayout,
  RoundTableConfig,
} from "./library";

import {
  blenderRoundTables,
  maxRoundTables,
} from "./round-table-exporters";

/**
 * Adapta as medidas da banqueta ao modelo circular.
 *
 * A altura corresponde ao topo do assento,
 * medido a partir da superfície do piso.
 */
function circularConfig(
  c: StoolConfig,
): RoundTableConfig {
  return {
    roundTables: c.stools,
    roundTableCount: c.stoolCount,
    roundTableDiameter: c.stoolSeatDiameter,
    roundTableHeight: c.stoolSeatHeight,
    roundTableTopThickness: c.stoolSeatThickness,
    roundTableGap: c.stoolGap,
    roundTableMat: c.stoolMat,
  };
}

/**
 * Usa nomes próprios para permitir que banquetas,
 * mesas redondas e bistrôs coexistam.
 */
function identifyStools(script: string): string {
  return script
    .split("Mesa_Redonda")
    .join("Banqueta")
    .split("criar_mesas_redondas")
    .join("criar_banquetas")
    .split("MESAS REDONDAS")
    .join("BANQUETAS")
    .split("mesas redondas")
    .join("banquetas");
}

export function blenderStools(
  c: StoolConfig,
  layout: StoolLayout,
): string {
  if (!c.stools || layout.positions.length === 0) {
    return "";
  }

  return identifyStools(
    blenderRoundTables(circularConfig(c), layout),
  );
}

export function maxStools(
  c: StoolConfig,
  layout: StoolLayout,
): string {
  if (!c.stools || layout.positions.length === 0) {
    return "";
  }

  return identifyStools(
    maxRoundTables(circularConfig(c), layout),
  );
}