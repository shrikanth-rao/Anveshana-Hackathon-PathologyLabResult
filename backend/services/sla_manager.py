"""
SLA Manager - 15-Minute Simulated SLA for Critical and Stat pathology reports.

Academic Project: PATHFLOW - BCS502 / BCS503
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from database import db
from models import Report, DispatchEvent
import uuid

class SLAManager:
    SLA_MINUTES = 15

    @classmethod
    def calculate_sla_deadline(cls, submitted_at: datetime, category: str) -> datetime:
        """Assigns a 15-minute SLA deadline to Critical and Stat reports."""
        if category in ['Critical', 'Stat']:
            return submitted_at + timedelta(minutes=cls.SLA_MINUTES)
        return None

    @classmethod
    def check_and_update_breaches(cls) -> List[Dict[str, Any]]:
        """
        Scans all unresolved Critical and Stat reports and flags breaches in the database.
        Emits dispatch breach events.
        """
        now = datetime.now(timezone.utc)
        breached_reports = Report.query.filter(
            Report.category.in_(['Critical', 'Stat']),
            Report.workflow_status != 'Resolved',
            Report.sla_breached == False,
            Report.sla_deadline.isnot(None),
            Report.sla_deadline < now
        ).all()

        breach_events = []
        for rep in breached_reports:
            rep.sla_breached = True
            evt = DispatchEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                report_id=rep.report_id,
                event_type="SLA_BREACH",
                event_description=f"15-Minute simulated SLA breached for {rep.category} report ({rep.report_id}).",
                priority=1,
                timestamp=now
            )
            db.session.add(evt)
            breach_events.append({
                'report_id': rep.report_id,
                'category': rep.category,
                'sla_deadline': rep.sla_deadline.isoformat(),
                'workflow_status': rep.workflow_status
            })

        if breach_events:
            db.session.commit()

        return breach_events

sla_manager = SLAManager()
