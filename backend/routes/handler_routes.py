from flask import Blueprint, request, jsonify
from database import db
from models import Handler, Report
from services.queue_manager import queue_manager

handler_bp = Blueprint('handler_bp', __name__)

@handler_bp.route('/api/handlers', methods=['GET'])
def get_handlers():
    """Returns list of duty doctors and current availability/load."""
    zone_id = request.args.get('zone_id')
    query = Handler.query
    if zone_id:
        query = query.filter_by(zone_id=zone_id)
    handlers = query.order_by(Handler.handler_id.asc()).all()
    return jsonify({'handlers': [h.to_dict() for h in handlers]}), 200

@handler_bp.route('/api/handlers/<handler_id>', methods=['GET'])
def get_handler(handler_id):
    """Returns details for a specific handler along with their active assignments."""
    handler = Handler.query.filter_by(handler_id=handler_id).first()
    if not handler:
        return jsonify({'error': 'Handler not found.'}), 404

    active_reports = Report.query.filter(
        Report.assigned_handler_id == handler_id,
        Report.workflow_status.in_(['Assigned', 'In Progress'])
    ).order_by(Report.priority.asc(), Report.submitted_at.asc()).all()

    return jsonify({
        'handler': handler.to_dict(),
        'active_reports': [r.to_dict() for r in active_reports]
    }), 200

@handler_bp.route('/api/handlers/<handler_id>', methods=['PATCH'])
def update_handler(handler_id):
    """
    Updates handler availability ('Available' / 'Unavailable') or capacity.
    Triggering availability or increased capacity automatically reevaluates waiting queues!
    """
    handler = Handler.query.filter_by(handler_id=handler_id).first()
    if not handler:
        return jsonify({'error': 'Handler not found.'}), 404

    data = request.get_json() or {}
    old_avail = handler.availability
    old_cap = handler.capacity

    if 'availability' in data:
        new_avail = data['availability'].strip().capitalize()
        if new_avail in ['Available', 'Unavailable']:
            handler.availability = new_avail

    if 'capacity' in data:
        try:
            new_cap = int(data['capacity'])
            if new_cap > 0:
                handler.capacity = new_cap
        except (ValueError, TypeError):
            pass

    db.session.commit()

    # If made Available or capacity increased, re-evaluate waiting reports in this zone
    queue_updates = []
    if (old_avail == 'Unavailable' and handler.availability == 'Available') or (handler.capacity > old_cap):
        queue_updates = queue_manager.reevaluate_waiting_queue(handler.zone_id)

    return jsonify({
        'message': f"Handler {handler.name} updated successfully.",
        'handler': handler.to_dict(),
        'queue_dispatches_triggered': queue_updates
    }), 200
