from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid

from database import db
from models import Report, AssignmentHistory, DispatchEvent, Handler
from services.validator import validator_service
from services.classifier import classifier_service
from services.dispatcher import dispatcher_service
from services.sla_manager import sla_manager
from services.queue_manager import queue_manager
from config import Config

report_bp = Blueprint('report_bp', __name__)

@report_bp.route('/api/reports', methods=['POST'])
def submit_report():
    """
    Complete Report Submission Endpoint:
    1. Validate fields (DFA + Regex)
    2. Classify report into 5 categories
    3. Route lookup & Dispatch
    4. Store in SQLite
    5. Return unique report ID & outcome
    """
    data = request.get_json() or {}
    
    patient_id = data.get('patient_id', '').strip()
    report_type = data.get('report_type', '').strip()
    report_code = data.get('report_code', '').strip().upper()
    zone_id = data.get('zone_id', '').strip()
    description = data.get('description', '').strip()
    reporter_id = data.get('reporter_id', 'USR-001')
    is_emergency = bool(data.get('is_emergency_override', False))

    now = datetime.now(timezone.utc)
    report_id = f"REP-{uuid.uuid4().hex[:6].upper()}"

    # Step 1: Pre-dispatch validation check
    is_valid, val_reason, val_comp = validator_service.validate_report_submission(data)
    validation_status = 'VALID' if is_valid else 'INVALID'

    # Step 2: Classification
    classification = classifier_service.classify(report_code, is_emergency_override=is_emergency)
    category = classification['category']
    priority = classification['priority']

    # Step 3: SLA Deadline calculation
    sla_deadline = sla_manager.calculate_sla_deadline(now, category)

    # Step 4: Persist Report
    report = Report(
        report_id=report_id,
        patient_id=patient_id,
        report_type=report_type,
        report_code=report_code,
        zone_id=zone_id,
        description=description,
        reporter_id=reporter_id,
        category=category,
        priority=priority,
        validation_status=validation_status,
        validation_reason=val_reason,
        workflow_status="Pending",
        submitted_at=now,
        sla_deadline=sla_deadline,
        sla_breached=False
    )
    db.session.add(report)
    db.session.commit()

    # Step 5: Dispatch execution if structurally valid
    dispatch_outcome = None
    if is_valid:
        dispatch_outcome = dispatcher_service.dispatch_report(report, dry_run=False)
    else:
        # Rejected before dispatch - record audit event
        evt = DispatchEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            report_id=report.report_id,
            event_type="VALIDATION_FAILED",
            event_description=f"Rejected before dispatch: {val_reason}",
            priority=priority,
            timestamp=now
        )
        db.session.add(evt)
        db.session.commit()
        dispatch_outcome = {
            "status": "REJECTED",
            "destination_queue": "REJECTION_LOG",
            "reason": val_reason,
            "steps": ["Patient ID failed DFA / Regex validation. Disallowed from routing table lookup."]
        }

    return jsonify({
        'message': 'Report processed successfully' if is_valid else 'Report rejected due to validation failure',
        'report': report.to_dict(),
        'validation': val_comp,
        'classification': classification,
        'dispatch': dispatch_outcome
    }), (201 if is_valid else 422)

@report_bp.route('/api/reports', methods=['GET'])
def get_reports():
    """Returns list of reports with optional filtering."""
    sla_manager.check_and_update_breaches()

    query = Report.query

    category = request.args.get('category')
    zone_id = request.args.get('zone_id')
    workflow_status = request.args.get('status')
    reporter_id = request.args.get('reporter_id')
    handler_id = request.args.get('handler_id')
    search = request.args.get('search', '').strip()

    if category:
        query = query.filter_by(category=category)
    if zone_id:
        query = query.filter_by(zone_id=zone_id)
    if workflow_status:
        query = query.filter_by(workflow_status=workflow_status)
    if reporter_id:
        query = query.filter_by(reporter_id=reporter_id)
    if handler_id:
        query = query.filter_by(assigned_handler_id=handler_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Report.report_id.ilike(search_pattern)) |
            (Report.patient_id.ilike(search_pattern)) |
            (Report.description.ilike(search_pattern))
        )

    reports = query.order_by(Report.submitted_at.desc()).all()
    return jsonify({
        'reports': [r.to_dict() for r in reports],
        'total': len(reports)
    }), 200

@report_bp.route('/api/reports/<report_id>', methods=['GET'])
def get_report_detail(report_id):
    """Returns complete report timeline, histories, and events."""
    sla_manager.check_and_update_breaches()
    report = Report.query.filter_by(report_id=report_id).first()
    if not report:
        return jsonify({'error': 'Report not found.'}), 404

    histories = AssignmentHistory.query.filter_by(report_id=report_id).order_by(AssignmentHistory.timestamp.asc()).all()
    events = DispatchEvent.query.filter_by(report_id=report_id).order_by(DispatchEvent.timestamp.asc()).all()
    handler = Handler.query.filter_by(handler_id=report.assigned_handler_id).first() if report.assigned_handler_id else None

    return jsonify({
        'report': report.to_dict(),
        'handler': handler.to_dict() if handler else None,
        'history': [h.to_dict() for h in histories],
        'events': [e.to_dict() for e in events]
    }), 200

@report_bp.route('/api/reports/<report_id>/status', methods=['PATCH'])
def update_report_status(report_id):
    """
    Updates workflow status:
    Pending -> Assigned -> In Progress -> Resolved.
    If Resolved, releases handler capacity and reevaluates waiting queue.
    """
    report = Report.query.filter_by(report_id=report_id).first()
    if not report:
        return jsonify({'error': 'Report not found.'}), 404

    data = request.get_json() or {}
    new_status = data.get('status', '').strip()
    notes = data.get('notes', 'Workflow status update')

    VALID_TRANSITIONS = {
        'Pending': ['Assigned', 'In Progress', 'Resolved'],
        'Assigned': ['In Progress', 'Resolved'],
        'In Progress': ['Resolved'],
        'Resolved': []
    }

    if new_status not in VALID_TRANSITIONS.get(report.workflow_status, []):
        return jsonify({
            'error': f"Invalid status transition from '{report.workflow_status}' to '{new_status}'."
        }), 400

    now = datetime.now(timezone.utc)
    old_status = report.workflow_status
    report.workflow_status = new_status

    if new_status == 'Resolved':
        report.resolved_at = now
        # Decrement active load on handler
        if report.assigned_handler_id:
            hnd = Handler.query.filter_by(handler_id=report.assigned_handler_id).first()
            if hnd and hnd.current_load > 0:
                hnd.current_load -= 1

    # Log history
    hist = AssignmentHistory(
        assignment_id=f"ASN-{uuid.uuid4().hex[:8].upper()}",
        report_id=report.report_id,
        previous_handler_id=report.assigned_handler_id,
        assigned_handler_id=report.assigned_handler_id,
        assignment_type="STATUS_CHANGE",
        assignment_reason=f"Status transitioned from {old_status} to {new_status}. {notes}",
        timestamp=now,
        status=new_status
    )
    db.session.add(hist)

    evt = DispatchEvent(
        event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
        report_id=report.report_id,
        event_type="STATUS_CHANGED",
        event_description=f"Status changed to {new_status} by handler.",
        priority=report.priority,
        timestamp=now
    )
    db.session.add(evt)
    db.session.commit()

    # If capacity freed up, re-evaluate waiting reports in zone
    assigned_from_queue = []
    if new_status == 'Resolved':
        assigned_from_queue = queue_manager.reevaluate_waiting_queue(report.zone_id)

    return jsonify({
        'message': f"Report status successfully updated to {new_status}.",
        'report': report.to_dict(),
        'queue_dispatches_triggered': assigned_from_queue
    }), 200
