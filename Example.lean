import Mathlib.Data.Nat.Prime
import Mathlib.Data.Nat.Parity
import Mathlib.Tactic.LibrarySearch
import Mathlib.Tactic.Linarith
import Std.Data.Int.Basic
import PaperProof

import Lean

#widget ppWidget .null

theorem th : ∀ (N : ℕ), ∃ M, N + N = M := by {
  intro n
  exact ⟨ n + n, rfl ⟩ 
}

theorem infinitude_of_primes : ∀ N, ∃ p, p ≥ N ∧ Nat.Prime p := by
  intro N

  let M := Nat.factorial N + 1
  let p := Nat.minFac M

  have pp : Nat.Prime p := by {
    apply Nat.minFac_prime
    have fac_pos: 0 < Nat.factorial N := Nat.factorial_pos N
    linarith
  }
  have ppos: p ≥ N := by {
    apply by_contradiction
    intro pln
    have h₁ : p ∣ Nat.factorial N := by  {
      apply pp.dvd_factorial.mpr
      exact le_of_not_ge pln
    }
    have h₂ : p ∣ Nat.factorial N + 1 := Nat.minFac_dvd M
    have h : p ∣ 1 := (Nat.dvd_add_right h₁).mp $ h₂
    exact Nat.Prime.not_dvd_one pp h
  }
  exact ⟨ p, ppos, pp ⟩

-- TODO: Parser doesn't work for this theorem yet
-- 1) "tactic rw" changing hypothesis should work
-- 2) Destructuring in have's intro's rintro's should work
theorem irrational_sqrt_2 : ¬ ∃ (q : ℚ), q * q = 2 := by
  apply not_exists.mpr
  intro ⟨n, d, _, coprime⟩ h
  have h₁ : n * n = 2 * d * d:= by
    rw [Rat.mul_def, ← Rat.normalize_self 2, Rat.normalize_eq_iff] at h
    simp at h
    linarith
  rw [← Int.natAbs_mul_self'] at h₁
  have ⟨n', h₂⟩ : ∃ n', n.natAbs = 2 * n' := by
    have hm : Even (2 * d * d) := by
      rw [Nat.even_mul, Nat.even_mul]
      left; left
      trivial
    sorry
  have ⟨d', h₃⟩ : ∃ d', d = 2 * d' := by sorry
  rw [h₂, h₃] at h₁
  rw [Nat.coprime_iff_gcd_eq_one, h₂, h₃] at coprime
  rw [Nat.gcd_mul_left] at coprime
  have r : ∀ k, ¬ 2 * k = 1 := by sorry
  apply r _ coprime