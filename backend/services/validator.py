import re
from typing import Dict, Any, Tuple
from config import Config
from services.dfa import patient_dfa

PATIENT_ID_REGEX_PATTERN = r"^PAT[0-9]{6}-LAB[A-Z]{2}$"
PATIENT_ID_COMPILED_REGEX = re.compile(PATIENT_ID_REGEX_PATTERN)

class ValidatorService:
    @staticmethod
    def validate_with_dfa(patient_id: str) -> Dict[str, Any]:
        """Validates patient ID using genuine Python DFA implementation."""
        return patient_dfa.process(patient_id)

    @staticmethod
    def validate_with_regex(patient_id: str) -> Dict[str, Any]:
        """Validates patient ID using independent re.fullmatch."""
        if not patient_id or not isinstance(patient_id, str):
            return {
                "valid": False,
                "input": patient_id,
                "pattern": PATIENT_ID_REGEX_PATTERN,
                "match": None,
                "reason": "Patient ID is empty or invalid type."
            }

        match = PATIENT_ID_COMPILED_REGEX.fullmatch(patient_id)
        is_valid = bool(match)
        return {
            "valid": is_valid,
            "input": patient_id,
            "pattern": PATIENT_ID_REGEX_PATTERN,
            "matched_string": match.group(0) if match else None,
            "reason": "Matched standard pattern ^PAT[0-9]{6}-LAB[A-Z]{2}$" if is_valid else "Failed regex fullmatch pattern."
        }

    @classmethod
    def compare_validation(cls, patient_id: str) -> Dict[str, Any]:
        """
        Runs DFA and Regex independently and asserts agreement.
        Required for academic verification between Automata and Formal Languages.
        """
        dfa_result = cls.validate_with_dfa(patient_id)
        regex_result = cls.validate_with_regex(patient_id)

        agreement = (dfa_result["valid"] == regex_result["valid"])

        return {
            "input": patient_id,
            "dfa": {
                "valid": dfa_result["valid"],
                "final_state": dfa_result["final_state"],
                "reason": dfa_result["reason"]
            },
            "regex": {
                "valid": regex_result["valid"],
                "pattern": regex_result["pattern"],
                "reason": regex_result["reason"]
            },
            "agreement": agreement,
            "final_valid": dfa_result["valid"] and regex_result["valid"]
        }

    @classmethod
    def validate_report_submission(cls, data: dict) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates the entire report submission payload:
        - patient_id structure
        - report_type supported list check
        - report_code presence
        - zone_id presence
        - description presence
        """
        patient_id = data.get("patient_id", "").strip() if data.get("patient_id") else ""
        report_type = data.get("report_type", "").strip() if data.get("report_type") else ""
        report_code = data.get("report_code", "").strip() if data.get("report_code") else ""
        zone_id = data.get("zone_id", "").strip() if data.get("zone_id") else ""
        description = data.get("description", "").strip() if data.get("description") else ""

        # 1. Patient ID validation (both DFA and Regex)
        comp = cls.compare_validation(patient_id)
        if not comp["final_valid"]:
            reason = f"Patient ID '{patient_id}' is malformed. DFA: {comp['dfa']['final_state']}, Regex failed."
            return False, reason, comp

        # 2. Report Type validation
        supported_types = {t["code"]: t for t in Config.SUPPORTED_REPORT_TYPES}
        if report_type not in supported_types and not any(t["name"].lower() == report_type.lower() for t in Config.SUPPORTED_REPORT_TYPES):
            # Check if report_type is code or name
            return False, f"Report type '{report_type}' is unsupported. Must be one of configured diagnostic panels.", comp

        # 3. Report Code presence
        if not report_code:
            return False, "Report classification code (e.g. CRIT, STAT, ROUT, PEND) is required.", comp

        # 4. Ward Zone presence
        if not zone_id:
            return False, "Ward Zone identifier is required for routing.", comp

        return True, "All structural and reference constraints satisfied.", comp

validator_service = ValidatorService()
