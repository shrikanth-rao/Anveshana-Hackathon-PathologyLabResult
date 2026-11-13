"""
Report Classification Engine.

Academic Project: PATHFLOW
Classification Categories:
1. Critical (Highest urgency, Priority 1)
2. Stat (Next highest urgency, Priority 2)
3. Routine (Normal processing, Priority 3)
4. Pending (Verification queue, Priority 99)
5. Error (Correction queue, Priority 100)
"""

from typing import Dict, Any
from config import Config

class ReportClassifier:
    CATEGORY_PRIORITIES = Config.CATEGORY_PRIORITIES
    CODE_MAP = Config.CODE_TO_CATEGORY

    @classmethod
    def classify(cls, report_code: str, is_emergency_override: bool = False, raw_data: dict = None) -> Dict[str, Any]:
        """
        Classifies report into exactly 5 categories with documented deterministic precedence:
        Precedence 1: Emergency / Critical clinical override -> Critical (Priority 1)
        Precedence 2: Exact or normalized match against configured CODE_MAP
        Precedence 3: Unmapped / unsupported code -> Error (Priority 100, Correction Queue)
        """
        normalized_code = report_code.strip().upper() if report_code else ""

        # Precedence 1: Emergency Override
        if is_emergency_override:
            return {
                "category": "Critical",
                "priority": 1,
                "rule_applied": "EMERGENCY_OVERRIDE",
                "destination_queue": "CRITICAL_DISPATCH",
                "explanation": "Report elevated to Critical via explicit emergency clinical override."
            }

        # Precedence 2: Exact known mapping
        if normalized_code in cls.CODE_MAP:
            category = cls.CODE_MAP[normalized_code]
            priority = cls.CATEGORY_PRIORITIES.get(category, 3)
            
            queue_name = "DISPATCH_QUEUE"
            if category == "Critical":
                queue_name = "CRITICAL_DISPATCH"
            elif category == "Stat":
                queue_name = "STAT_DISPATCH"
            elif category == "Routine":
                queue_name = "ROUTINE_QUEUE"
            elif category == "Pending":
                queue_name = "VERIFICATION_QUEUE"

            return {
                "category": category,
                "priority": priority,
                "rule_applied": f"CODE_MAP_{normalized_code}",
                "destination_queue": queue_name,
                "explanation": f"Report code '{normalized_code}' deterministically mapped to '{category}' (Priority {priority})."
            }

        # Precedence 3: Unmapped or invalid code -> Error
        return {
            "category": "Error",
            "priority": cls.CATEGORY_PRIORITIES["Error"],
            "rule_applied": "UNMAPPED_CODE_ERROR",
            "destination_queue": "CORRECTION_QUEUE",
            "explanation": f"Unknown report code '{report_code}' cannot be silently routed. Assigned to Error category for administrative review."
        }

classifier_service = ReportClassifier()
