import { ConvertedProofTree, Tactic, TabledHyp, TabledTactic, Box, HypNode } from "types";

const getDirectChildHypsInThisBox = (proofTree: ConvertedProofTree, hypLayers: Box['hypLayers'], hypNodeId: string) : string[] => {
  for (const hypLayer of hypLayers) {
    const tactic = proofTree.tactics.find((tactic) => tactic.id === hypLayer.tacticId)!;
    const tacticShard = tactic.hypArrows.find((shard) => shard.fromId === hypNodeId);
    if (tacticShard) return tacticShard.toIds;
  }
  return [];
}

const getChildrenWidth = (proofTree: ConvertedProofTree, hypLayers: Box['hypLayers'], hypNodeId: string) : number => {
  const directChildIds : string[] = getDirectChildHypsInThisBox(proofTree, hypLayers, hypNodeId);

  // base case
  if (directChildIds.length === 0) {
    return 1;
  // recursive case
  } else {
    let width = 0;
    directChildIds.forEach((childId) => {
      width += getChildrenWidth(proofTree, hypLayers, childId)
    });
    return width;
  }
}

const getChildrenWidths = (proofTree: ConvertedProofTree, hypLayers: Box['hypLayers'], hypNodeIds: string[]) : number => {
  let sum = 0;
  hypNodeIds.forEach((hypNodeId) => {
    sum += getChildrenWidth(proofTree, hypLayers, hypNodeId);
  });
  return sum;
}

const doAnyLayersBelowHaveParentsAbove = (hypLayers: Box['hypLayers'], hypLayerIndex: number, proofTree: ConvertedProofTree) : boolean => {
  const hypLayersAbove = hypLayers.slice(0, hypLayerIndex);
  const hypLayersBelow = hypLayers.slice(hypLayerIndex);
  return hypLayersBelow.some((hypLayer) => {
    const tactic : Tactic = proofTree.tactics.find((tactic) => tactic.id === hypLayer.tacticId)!;
    return tactic.hypArrows.some((tacticShard) => {
      return hypLayersAbove.some((hypLayer) => {
        const parent = hypLayer.hypNodes.find((hypNode) => hypNode.id === tacticShard.fromId);
        return parent ? true : false;
      });
    });
  });
}

interface Table {
  tabledHyps: TabledHyp[];
  tabledTactics: TabledTactic[];
  currentRow: number
}

const getTabledHypFromTables = (tables : Table[], hypId: string | null) : TabledHyp | undefined => {
  if (hypId === null) return undefined;
  const tabledHyps = tables.map((table) => table.tabledHyps).flat();
  return tabledHyps.find((tabledHyp) => tabledHyp.hypNode.id === hypId);
}

const hypLayersToTabledCells = (hypLayers : Box['hypLayers'], proofTree: ConvertedProofTree) => {
  const tables : Table[] = [];
  let currentTable : Table = tables[tables.length - 1];

  hypLayers.forEach((hypLayer, hypLayerIndex) => {
    const tactic : Tactic = proofTree.tactics.find((tactic) => tactic.id === hypLayer.tacticId)!;

    // Start a new table if none of the hypotheses inherit from each other!
    if (!doAnyLayersBelowHaveParentsAbove(hypLayers, hypLayerIndex, proofTree)) {
      tables.push({ tabledHyps: [], tabledTactics: [], currentRow: 0 });
      currentTable = tables[tables.length - 1];
    }

    // Some tactic shards are outside the box we're currently drawing
    const interestingTacticShards = tactic.hypArrows.filter((tacticShard) =>
      tacticShard.toIds.some((toId) =>
        hypLayer.hypNodes.map((hypNode) => hypNode.id).includes(toId)
      )
    );
    interestingTacticShards.forEach((tacticShard) => {
      const parentHyp = getTabledHypFromTables(tables, tacticShard.fromId);

      const maxColumn = Math.max(...currentTable.tabledHyps.map((hyp) => hyp.columnTo), 0);
      const columnFrom = parentHyp ? parentHyp.columnFrom : maxColumn;
      const allChildrenWidths = getChildrenWidths(proofTree, hypLayers, tacticShard.toIds);

      currentTable.tabledTactics.push({
        tactic,
        columnFrom,
        columnTo: columnFrom + allChildrenWidths,
        row: currentTable.currentRow
      });

      let hypColumnFrom = columnFrom;
      tacticShard.toIds.forEach((toId) => {
        const hypNode = hypLayer.hypNodes.find((hypNode) => hypNode.id === toId)!;
        // This shouldn't happen as far as I'm aware, but can be investigated in the converter. 
        if (!hypNode) return

        const childrenWidth = getChildrenWidth(proofTree, hypLayers, toId);
        currentTable.tabledHyps.push({
          hypNode,
          columnFrom: hypColumnFrom,
          columnTo: hypColumnFrom + childrenWidth,
          row: currentTable.currentRow + 1
        });
        hypColumnFrom += childrenWidth;
      });
    });
    currentTable.currentRow += 2;
  });

  return tables;
}

export default hypLayersToTabledCells;
