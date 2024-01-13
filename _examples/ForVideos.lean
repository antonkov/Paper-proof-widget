import Mathlib.Data.Set.Basic
import Paperproof
open Set

theorem commutativityOfIntersections
(s t : Set Nat) : s ∩ t = t ∩ s := by
  ext x
  apply Iff.intro

  intro h1
  rw [mem_inter_iff, and_comm] at h1
  exact h1

  intro h2
  rw [mem_inter_iff, and_comm] at h2
  exact h2
