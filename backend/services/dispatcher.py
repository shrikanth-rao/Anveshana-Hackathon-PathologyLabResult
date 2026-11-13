"""
Dispatcher Service - Priority-Based Routing, Handler Availability, Capacity Check, Fallback, and Escalation.

Academic Project: PATHFLOW - BCS502 / BCS503
"""

from datetime import datetime, timezone, timedelta
import uuid
from typing import Dict, Any, Optional

from database import db
from models import Report, Handler, Zone, RoutingRule, AssignmentHistory, DispatchEvent
from services.validator import validator_service
from services.classifier import classifier_service
from services.routing import routing_service
from config import Config

class DispatcherService:
    @staticmethod
    def is_handler_eligible(handler: Optional[Handler]) -> Tuple[bool, str]:
        """Checks if a duty doctor is available and has remaining workload capacity."""
        if not handler:
            return False, "Handler not found in registry."
        if handler.availability.lower() != 'available':
            return False, f"Handler {handler.name} ({handler.handler_id}) is currently UNAVAILABLE."
        if handler.current_load >= handler.capacity:
            return False, f"Handler {handler.name} has exceeded capacity ({handler.current_load}/{handler.capacity})."
        return True, "Eligible"

    @classmethod
    def dispatch_report(cls, report: Report, dry_run: bool = False) -> Dict[str, Any]:
        """
        Executes deterministic dispatch algorithm on a report.
        If dry_run=True, executes identical logic without persisting database state.
        """
        decision_steps = []
        now = datetime.now(timezone.utc)

        # Step 1: Pre-dispatch validation check
        if report.validation_status != 'VALID':
            outcome = {
                "report_id": report.report_id,
                "status": "REJECTED",
                "assigned_handler_id": None,
                "destination_queue": "REJECTION_LOG",
                "reason": f"Pre-dispatch validation failed: {report.validation_reason}",
                "steps": ["Validation failed. Report rejected before routing table lookup."]
            }
            if not dry_run:
                event = DispatchEvent(
                    event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                    report_id=report.report_id,
                    event_type="VALIDATION_FAILED",
                    event_description=outcome["reason"],
                    priority=report.priority,
                    timestamp=now
                )
                db.session.add(event)
                db.session.commit()
            return outcome

        category = report.category
        zone_id = report.zone_id

        # Step 2: Verification and Correction queues bypass primary doctor assignment
        if category == "Pending":
            decision_steps.append("Report classified as Pending -> Directed to Verification Queue.")
            outcome = {
                "report_id": report.report_id,
                "status": "QUEUED_VERIFICATION",
                "assigned_handler_id": None,
                "destination_queue": "VERIFICATION_QUEUE",
                "reason": "Pending laboratory reports require specimen/order re-verification.",
                "steps": decision_steps
            }
            if not dry_run:
                report.workflow_status = "Pending"
                db.session.commit()
            return outcome

        if category == "Error":
            decision_steps.append("Report classified as Error -> Directed to Administrative Correction Queue.")
            outcome = {
                "report_id": report.report_id,
                "status": "QUEUED_CORRECTION",
                "assigned_handler_id": None,
                "destination_queue": "CORRECTION_QUEUE",
                "reason": "Unrecognized or malformed report code routed to correction queue.",
                "steps": decision_steps
            }
            if not dry_run:
                report.workflow_status = "Pending"
                db.session.commit()
            return outcome

        # Step 3: Ward Zone Validation
        is_zone_valid, zone = routing_service.validate_zone(zone_id)
        if not is_zone_valid:
            decision_steps.append(f"Zone '{zone_id}' not found in routing directory.")
            # For Critical or Stat, raise an escalation event
            is_urgent = category in ["Critical", "Stat"]
            fallback_reason = f"Unknown ward zone '{zone_id}'. Escalated to Central Dispatch." if is_urgent else f"Unknown ward zone '{zone_id}'. Routed to Central Fallback Queue."
            decision_steps.append(fallback_reason)

            outcome = {
                "report_id": report.report_id,
                "status": "ESCALATED_UNKNOWN_ZONE" if is_urgent else "FALLBACK_UNKNOWN_ZONE",
                "assigned_handler_id": None,
                "destination_queue": "CENTRAL_ESCALATION_QUEUE" if is_urgent else "CENTRAL_FALLBACK_QUEUE",
                "reason": fallback_reason,
                "steps": decision_steps
            }
            if not dry_run:
                event = DispatchEvent(
                    event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                    report_id=report.report_id,
                    event_type="ESCALATION" if is_urgent else "FALLBACK",
                    event_description=fallback_reason,
                    priority=report.priority,
                    timestamp=now
                )
                db.session.add(event)
                report.workflow_status = "Pending"
                db.session.commit()
            return outcome

        decision_steps.append(f"Zone '{zone_id}' validated ({zone.zone_name}).")

        # Step 4: Routing Table Lookup
        rule = routing_service.get_zone_rule(zone_id, category)
        primary_id = rule.primary_handler_id if rule else None
        backup_id = rule.backup_handler_id if rule else None

        primary_handler = Handler.query.filter_by(handler_id=primary_id).first() if primary_id else None
        backup_handler = Handler.query.filter_by(handler_id=backup_id).first() if backup_id else None

        decision_steps.append(f"Routing rule inspected: Primary={primary_id or 'None'}, Backup={backup_id or 'None'}.")

        # Step 5: Check Primary Handler
        primary_eligible, primary_reason = cls.is_handler_eligible(primary_handler)
        if primary_eligible:
            decision_steps.append(f"Primary handler {primary_handler.name} is Available and has capacity ({primary_handler.current_load + 1}/{primary_handler.capacity}).")
            if not dry_run:
                # Update report & handler load
                report.assigned_handler_id = primary_handler.handler_id
                report.workflow_status = "Assigned"
                report.assigned_at = now
                primary_handler.current_load += 1

                # History
                hist = AssignmentHistory(
                    assignment_id=f"ASN-{uuid.uuid4().hex[:8].upper()}",
                    report_id=report.report_id,
                    previous_handler_id=None,
                    assigned_handler_id=primary_handler.handler_id,
                    assignment_type="PRIMARY",
                    assignment_reason=f"Standard primary assignment for {zone_id} [{category}]",
                    timestamp=now,
                    status="Assigned"
                )
                db.session.add(hist)

                # Event
                evt = DispatchEvent(
                    event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                    report_id=report.report_id,
                    event_type="PRIMARY_ASSIGNED",
                    event_description=f"Assigned to primary duty doctor {primary_handler.name} ({primary_handler.handler_id}).",
                    priority=report.priority,
                    timestamp=now
                )
                db.session.add(evt)
                db.session.commit()

            return {
                "report_id": report.report_id,
                "status": "ASSIGNED_PRIMARY",
                "assigned_handler_id": primary_handler.handler_id,
                "assigned_handler_name": primary_handler.name,
                "destination_queue": "HANDLER_ACTIVE_LOAD",
                "reason": f"Dispatched to primary duty doctor {primary_handler.name}.",
                "steps": decision_steps
            }

        decision_steps.append(f"Primary handler check failed: {primary_reason}")

        # Step 6: Check Backup Handler
        backup_eligible, backup_reason = cls.is_handler_eligible(backup_handler)
        if backup_eligible:
            decision_steps.append(f"Backup handler {backup_handler.name} selected as fallback: Available with capacity ({backup_handler.current_load + 1}/{backup_handler.capacity}).")
            if not dry_run:
                report.assigned_handler_id = backup_handler.handler_id
                report.workflow_status = "Assigned"
                report.assigned_at = now
                backup_handler.current_load += 1

                hist = AssignmentHistory(
                    assignment_id=f"ASN-{uuid.uuid4().hex[:8].upper()}",
                    report_id=report.report_id,
                    previous_handler_id=primary_id,
                    assigned_handler_id=backup_handler.handler_id,
                    assignment_type="BACKUP",
                    assignment_reason=f"Primary unavailable ({primary_reason}). Dispatched to backup handler.",
                    timestamp=now,
                    status="Assigned"
                )
                db.session.add(hist)

                evt = DispatchEvent(
                    event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                    report_id=report.report_id,
                    event_type="BACKUP_ASSIGNED",
                    event_description=f"Primary bypassed ({primary_reason}). Dispatched to backup handler {backup_handler.name}.",
                    priority=report.priority,
                    timestamp=now
                )
                db.session.add(evt)
                db.session.commit()

            return {
                "report_id": report.report_id,
                "status": "ASSIGNED_BACKUP",
                "assigned_handler_id": backup_handler.handler_id,
                "assigned_handler_name": backup_handler.name,
                "destination_queue": "HANDLER_ACTIVE_LOAD",
                "reason": f"Primary bypassed. Assigned to backup duty doctor {backup_handler.name}.",
                "steps": decision_steps
            }

        decision_steps.append(f"Backup handler check failed: {backup_reason}")

        # Step 7: Neither Primary nor Backup eligible -> Fallback / Escalation
        if category == "Critical":
            decision_steps.append("CRITICAL REPORT: Both zone handlers full or unavailable. Preempting standard flow and triggering CRITICAL EMERGENCY ESCALATION.")
            outcome_status = "ESCALATED_CRITICAL"
            dest_queue = "ESCALATION_QUEUE"
            reason = f"CRITICAL REPORT ESCALATED: Primary ({primary_reason}) & Backup ({backup_reason}) both unavailable."
        elif category == "Stat":
            decision_steps.append("STAT REPORT: Handlers saturated. Retaining High Priority in STAT Priority Waiting Queue.")
            outcome_status = "WAITING_QUEUE_STAT"
            dest_queue = "STAT_WAITING_QUEUE"
            reason = f"Stat report queued with priority 2 awaiting handler availability ({primary_reason}, {backup_reason})."
        else:
            decision_steps.append("Routine report placed in standard Routine Waiting Queue.")
            outcome_status = "WAITING_QUEUE_ROUTINE"
            dest_queue = "ROUTINE_WAITING_QUEUE"
            reason = f"Routine report placed in waiting queue ({primary_reason})."

        if not dry_run:
            report.workflow_status = "Pending"
            report.assigned_handler_id = None

            hist = AssignmentHistory(
                assignment_id=f"ASN-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.report_id,
                previous_handler_id=None,
                assigned_handler_id=None,
                assignment_type="ESCALATION" if category == "Critical" else "WAITING_QUEUE",
                assignment_reason=reason,
                timestamp=now,
                status="Pending"
            )
            db.session.add(hist)

            evt = DispatchEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.report_id,
                event_type="ESCALATION" if category == "Critical" else "QUEUED",
                event_description=reason,
                priority=report.priority,
                timestamp=now
            )
            db.session.add(evt)
            db.session.commit()

        return {
            "report_id": report.report_id,
            "status": outcome_status,
            "assigned_handler_id": None,
            "destination_queue": dest_queue,
            "reason": reason,
            "steps": decision_steps
        }

dispatcher_service = DispatcherService()
