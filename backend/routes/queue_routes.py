from flask import Blueprint, request, jsonify
from services.queue_manager import queue_manager
from services.sla_manager import sla_manager
from models import Report

queue_bp = Blueprint('queue_bp', __name__)

@queue_bp.route('/api/queues', methods=['GET'])
def get_all_queues():
    """Returns priority sorted dispatch queue, along with verification and correction queues."""
    sla_manager.check_and_update_breaches()

    category_filter = request.args.get('category')
    zone_filter = request.args.get('zone_id')

    dispatch_queue = queue_manager.get_dispatch_queue(category_filter, zone_filter)
    verification_queue = queue_manager.get_verification_queue()
    correction_queue = queue_manager.get_correction_queue()

    # Queue summary metrics
    crit_count = sum(1 for q in dispatch_queue if q['category'] == 'Critical')
    stat_count = sum(1 for q in dispatch_queue if q['category'] == 'Stat')
    routine_count = sum(1 for q in dispatch_queue if q['category'] == 'Routine')
    assigned_count = sum(1 for q in dispatch_queue if q['workflow_status'] in ['Assigned', 'In Progress'])
    waiting_count = sum(1 for q in dispatch_queue if q['workflow_status'] == 'Pending' and not q.get('assigned_handler_id'))

    return jsonify({
        'summary': {
            'total_queued': len(dispatch_queue),
            'critical_count': crit_count,
            'stat_count': stat_count,
            'routine_count': routine_count,
            'verification_count': len(verification_queue),
            'correction_count': len(correction_queue),
            'assigned_count': assigned_count,
            'waiting_count': waiting_count
        },
        'dispatch_queue': dispatch_queue,
        'verification_queue': verification_queue,
        'correction_queue': correction_queue
    }), 200

@queue_bp.route('/api/queues/process', methods=['POST'])
def process_queues():
    """Manual or event trigger to evaluate waiting reports against available capacity."""
    data = request.get_json() or {}
    zone_id = data.get('zone_id')
    results = queue_manager.reevaluate_waiting_queue(zone_id)
    return jsonify({
        'message': f"Processed waiting queues. {len(results)} assignments made.",
        'dispatches': results
    }), 200
