"""
Smart Queue Manager - Deterministic Priority Ordering and Queue Operations.

Academic Project: PATHFLOW - BCS502
Ordering Rules:
1. Critical reports (Priority 1)
2. Stat reports (Priority 2)
3. Routine reports (Priority 3)
4. FIFO based on submission timestamp (ascending)
5. Report ID as deterministic tie-breaker
"""

from typing import List, Dict, Any
from datetime import datetime, timezone
from models import Report, Handler
from database import db
from services.dispatcher import dispatcher_service

class QueueManager:
    @staticmethod
    def get_dispatch_queue(category_filter: str = None, zone_filter: str = None) -> List[Dict[str, Any]]:
        """
        Returns active dispatch queue strictly sorted:
        Priority ASC (1=Critical, 2=Stat, 3=Routine),
        submitted_at ASC (FIFO),
        report_id ASC (Tie-breaker).
        Only valid reports in 'Critical', 'Stat', 'Routine' categories.
        """
        query = Report.query.filter(
            Report.validation_status == 'VALID',
            Report.category.in_(['Critical', 'Stat', 'Routine'])
        )

        if category_filter:
            query = query.filter(Report.category == category_filter)
        if zone_filter:
            query = query.filter(Report.zone_id == zone_filter)

        reports = query.order_by(
            Report.priority.asc(),
            Report.submitted_at.asc(),
            Report.report_id.asc()
        ).all()

        queue_list = []
        now = datetime.now(timezone.utc)
        for idx, rep in enumerate(reports):
            d = rep.to_dict()
            d['queue_position'] = idx + 1
            if rep.submitted_at:
                sub_time = rep.submitted_at.replace(tzinfo=timezone.utc) if rep.submitted_at.tzinfo is None else rep.submitted_at
                d['waiting_time_seconds'] = int((now - sub_time).total_seconds())
            else:
                d['waiting_time_seconds'] = 0
            queue_list.append(d)

        return queue_list

    @staticmethod
    def get_verification_queue() -> List[Dict[str, Any]]:
        """Returns reports waiting in the Pending verification queue."""
        reports = Report.query.filter_by(category='Pending').order_by(Report.submitted_at.asc()).all()
        return [r.to_dict() for r in reports]

    @staticmethod
    def get_correction_queue() -> List[Dict[str, Any]]:
        """Returns reports waiting in the Error correction queue."""
        reports = Report.query.filter_by(category='Error').order_by(Report.submitted_at.asc()).all()
        return [r.to_dict() for r in reports]

    @classmethod
    def reevaluate_waiting_queue(cls, zone_id: str = None) -> List[Dict[str, Any]]:
        """
        Evaluates unassigned waiting reports in deterministic priority order
        and assigns them if an eligible handler has freed up capacity.
        """
        query = Report.query.filter(
            Report.validation_status == 'VALID',
            Report.workflow_status == 'Pending',
            Report.assigned_handler_id.is_(None),
            Report.category.in_(['Critical', 'Stat', 'Routine'])
        )
        if zone_id:
            query = query.filter_by(zone_id=zone_id)

        waiting_reports = query.order_by(
            Report.priority.asc(),
            Report.submitted_at.asc(),
            Report.report_id.asc()
        ).all()

        results = []
        for rep in waiting_reports:
            dispatch_res = dispatcher_service.dispatch_report(rep, dry_run=False)
            if dispatch_res.get("status") in ["ASSIGNED_PRIMARY", "ASSIGNED_BACKUP"]:
                results.append({
                    "report_id": rep.report_id,
                    "new_status": dispatch_res.get("status"),
                    "assigned_handler_id": dispatch_res.get("assigned_handler_id"),
                    "reason": dispatch_res.get("reason")
                })
        return results

queue_manager = QueueManager()
