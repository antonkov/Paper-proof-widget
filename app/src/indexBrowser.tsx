import React, { useEffect, useState } from "react";
import { createRoot } from 'react-dom/client';
import { ProofResponse, PaperProofWindow, ConvertedProofTree, Highlights, Arrow, LeanInteractiveGoal } from "types";
import "./index.css";
import ProofTree from "./components/ProofTree";
import converter from "./services/converter";
import getHighlights from "./components/ProofTree/services/getHighlights";
import hypsToTables from "./services/hypsToTables";
import createArrows from './services/createArrows';
import PerfectArrow from "./components/PerfectArrow";

import Snackbar from '@mui/material/Snackbar';
import zoomOnNavigation from "./components/ProofTree/services/zoomOnNavigation";
import getStatement from "./services/getStatement";

// Allowing certain properties on window
declare const window: PaperProofWindow;

interface Converted {
  proofTree: ConvertedProofTree;
  highlights: Highlights;
  statement: string | null;
  currentGoal: LeanInteractiveGoal | null;
}

function Main() {
  const [converted, setConverted] = useState<Converted | null>(null);

  const [perfectArrows, setPerfectArrows] = useState<Arrow[]>([]);

  // We do need separate state vars for prettier animations
  const [snackbarMessage, setSnackbarMessage] = useState<String | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

  const updateUI = (proofResponse : ProofResponse) => {
    if ("error" in proofResponse) {
      if (proofResponse.error === 'File changed.' || proofResponse.error === 'stillTyping') {
        // This is a normal situation, just return.
      } else if (proofResponse.error === 'leanNotYetRunning') {
        setSnackbarMessage("Waiting for Lean");
        setSnackbarOpen(true);
      } else if (proofResponse.error.startsWith("No RPC method")) {
        setSnackbarMessage(`Missing "import Paperproof" in this .lean file, please import it.`);
        setSnackbarOpen(true);
      } else if (proofResponse.error === 'zeroProofSteps') {
        setSnackbarMessage("Not within theorem");
        setSnackbarOpen(true);
      } else {
        console.warn("We are not handling some error explicitly?", proofResponse);
      }
      return;
    }
    setSnackbarOpen(false);

    // ___Why don't we memoize these functions/avoid rerenders?
    //    These seem like expensive operations, however they aren't!
    //    The whole converter()+hypsToTables() process takes from 2ms to 5ms.
    //    The delay we see in the UI is coming from "Making getSnapshotData request" vscode rpc.
    const convertedProofTree : ConvertedProofTree = converter(proofResponse.proofTree);
    convertedProofTree.boxes.forEach((box) => {
      box.hypTables = hypsToTables(box.hypLayers, convertedProofTree)
    });
    const newHighlights = getHighlights(convertedProofTree.equivalentIds, proofResponse.goal);
    const currentStatement = getStatement(proofResponse.proofTree);

    setConverted({
      proofTree: convertedProofTree,
      highlights: newHighlights,
      statement: currentStatement,
      currentGoal: proofResponse.goal
    });
  }

  useEffect(() => {
    if (window.initialInfo) {
      const proofResponse : ProofResponse = window.initialInfo;
      updateUI(proofResponse);
    }

    addEventListener("message", (event) => {
      const proofResponse : ProofResponse = event.data as ProofResponse;
      updateUI(proofResponse);
    });
  }, [])

  React.useLayoutEffect(() => {
    if (!converted) return;

    const newPerfectArrows = createArrows(converted.proofTree);
    setPerfectArrows(newPerfectArrows);

    zoomOnNavigation(converted.proofTree, converted.currentGoal?.mvarId);
  }, [converted]);

  React.useEffect(() => {
    localStorage.removeItem('zoomedBoxId');
  }, [converted?.statement])

  return <>
    {
      converted &&
      <div className="proof-tree">
        <ProofTree proofTree={converted.proofTree} highlights={converted.highlights}/>
        {perfectArrows.map((arrow, index) =>
          <PerfectArrow key={index} p1={arrow.from} p2={arrow.to}/>
        )}
      </div>
    }
    <Snackbar
      open={snackbarOpen}
      autoHideDuration={null}
      message={snackbarMessage}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    />
  </>
}

const root = createRoot(document.getElementById("root")!);
root.render(<Main/>);
