from flask import Blueprint, request, jsonify
from database import db
from models import RoutingRule, Zone, Handler, DispatchEvent
from services.routing import routing_service

routing_bp = Blueprint('routing_bp', __name__)

@routing_bp.route('/api/routing', methods=['GET'])
def get_routing_rules():
    """Returns explicit routing rules with primary and backup handler profiles."""
    routes = routing_service.get_all_routes()
    return jsonify({'routing_table': routes}), 200

@routing_bp.route('/api/routing/<rule_id>', methods=['PATCH'])
def update_routing_rule(rule_id):
    """Admin configuration: updates primary or backup handler for a routing rule."""
    rule = RoutingRule.query.filter_by(routing_rule_id=rule_id).first()
    if not rule:
        return jsonify({'error': 'Routing rule not found.'}), 404

    data = request.get_json() or {}
    if 'primary_handler_id' in data:
        rule.primary_handler_id = data['primary_handler_id']
    if 'backup_handler_id' in data:
        rule.backup_handler_id = data['backup_handler_id']
    if 'priority' in data:
        rule.priority = int(data['priority'])

    db.session.commit()
    return jsonify({
        'message': 'Routing rule updated successfully.',
        'rule': rule.to_dict()
    }), 200

@routing_bp.route('/api/routing/zones', methods=['GET'])
def get_zones():
    """Returns list of active hospital ward zones."""
    zones = Zone.query.all()
    return jsonify({'zones': [z.to_dict() for z in zones]}), 200

@routing_bp.route('/api/routing/events', methods=['GET'])
def get_dispatch_events():
    """Returns audit log of dispatch, fallback, and escalation events."""
    limit = request.args.get('limit', default=50, type=int)
    events = DispatchEvent.query.order_by(DispatchEvent.timestamp.desc()).limit(limit).all()
    return jsonify({'events': [e.to_dict() for e in events]}), 200
