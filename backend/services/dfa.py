"""
Deterministic Finite Automaton (DFA) Implementation for Patient ID Validation.

Academic Project: PATHFLOW - Automata Theory & Computability (BCS503)
Language: L = { PAT<6 digits>-LAB<2 uppercase letters> }
Formal definition:
M = (Q, Sigma, delta, q0, F)
Q = {q0, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, DEAD}
Sigma = ASCII alphanumeric characters + '-'
Start state = q0
F = {q15}
"""

class PatientIdDFA:
    STATES = [
        'q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7',
        'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'DEAD'
    ]
    START_STATE = 'q0'
    ACCEPTING_STATES = {'q15'}

    STATE_DESCRIPTIONS = {
        'q0': 'Start State - Expecting "P"',
        'q1': 'Matched "P" - Expecting "A"',
        'q2': 'Matched "PA" - Expecting "T"',
        'q3': 'Matched "PAT" - Expecting 1st digit',
        'q4': 'Matched 1st digit - Expecting 2nd digit',
        'q5': 'Matched 2nd digit - Expecting 3rd digit',
        'q6': 'Matched 3rd digit - Expecting 4th digit',
        'q7': 'Matched 4th digit - Expecting 5th digit',
        'q8': 'Matched 5th digit - Expecting 6th digit',
        'q9': 'Matched 6 digits - Expecting hyphen "-"',
        'q10': 'Matched "-" - Expecting "L"',
        'q11': 'Matched "L" - Expecting "A"',
        'q12': 'Matched "A" - Expecting "B"',
        'q13': 'Matched "LAB" - Expecting 1st uppercase letter',
        'q14': 'Matched 1st letter - Expecting 2nd uppercase letter',
        'q15': 'Accepting State - Valid Patient ID',
        'DEAD': 'Rejection State - Syntax or length violation'
    }

    @staticmethod
    def transition(current_state: str, char: str) -> str:
        """
        Transition function delta(q, char) -> q'
        """
        if current_state == 'DEAD':
            return 'DEAD'

        if current_state == 'q0':
            return 'q1' if char == 'P' else 'DEAD'
        elif current_state == 'q1':
            return 'q2' if char == 'A' else 'DEAD'
        elif current_state == 'q2':
            return 'q3' if char == 'T' else 'DEAD'
        elif current_state == 'q3':
            return 'q4' if char.isdigit() else 'DEAD'
        elif current_state == 'q4':
            return 'q5' if char.isdigit() else 'DEAD'
        elif current_state == 'q5':
            return 'q6' if char.isdigit() else 'DEAD'
        elif current_state == 'q6':
            return 'q7' if char.isdigit() else 'DEAD'
        elif current_state == 'q7':
            return 'q8' if char.isdigit() else 'DEAD'
        elif current_state == 'q8':
            return 'q9' if char.isdigit() else 'DEAD'
        elif current_state == 'q9':
            return 'q10' if char == '-' else 'DEAD'
        elif current_state == 'q10':
            return 'q11' if char == 'L' else 'DEAD'
        elif current_state == 'q11':
            return 'q12' if char == 'A' else 'DEAD'
        elif current_state == 'q12':
            return 'q13' if char == 'B' else 'DEAD'
        elif current_state == 'q13':
            return 'q14' if ('A' <= char <= 'Z') else 'DEAD'
        elif current_state == 'q14':
            return 'q15' if ('A' <= char <= 'Z') else 'DEAD'
        elif current_state == 'q15':
            # Extra characters after reaching accepting state trigger dead state
            return 'DEAD'
        return 'DEAD'

    def process(self, input_string: str) -> dict:
        """
        Processes the input string character-by-character through the DFA.
        Returns full trace for educational visualization and backend validation.
        """
        if input_string is None:
            input_string = ""

        current = self.START_STATE
        steps = []

        if len(input_string) == 0:
            return {
                "valid": False,
                "input": input_string,
                "final_state": self.START_STATE,
                "is_accepting": False,
                "steps": [],
                "reason": "Patient ID cannot be empty. Expected format: PAT[6-digits]-LAB[2-letters]"
            }

        for idx, ch in enumerate(input_string):
            next_state = self.transition(current, ch)
            step_record = {
                "step": idx + 1,
                "char": ch,
                "from_state": current,
                "to_state": next_state,
                "from_desc": self.STATE_DESCRIPTIONS.get(current, ""),
                "to_desc": self.STATE_DESCRIPTIONS.get(next_state, ""),
                "is_dead": next_state == 'DEAD'
            }
            steps.append(step_record)
            current = next_state
            if current == 'DEAD':
                # Continue tracing remaining characters for full visualization trace
                for rem_idx in range(idx + 1, len(input_string)):
                    rem_ch = input_string[rem_idx]
                    steps.append({
                        "step": rem_idx + 1,
                        "char": rem_ch,
                        "from_state": 'DEAD',
                        "to_state": 'DEAD',
                        "from_desc": self.STATE_DESCRIPTIONS['DEAD'],
                        "to_desc": self.STATE_DESCRIPTIONS['DEAD'],
                        "is_dead": True
                    })
                break

        is_valid = (current in self.ACCEPTING_STATES)

        if is_valid:
            reason = "Valid Patient ID accepted by DFA in state q15."
        elif current == 'DEAD':
            reason = f"DFA transitioned to DEAD rejection state due to structural mismatch (expected PAT<6 digits>-LAB<2 uppercase letters>)."
        else:
            reason = f"DFA halted prematurely in non-accepting state '{current}'. Incomplete Patient ID."

        return {
            "valid": is_valid,
            "input": input_string,
            "final_state": current,
            "is_accepting": is_valid,
            "steps": steps,
            "reason": reason
        }

# Global reusable instance
patient_dfa = PatientIdDFA()
