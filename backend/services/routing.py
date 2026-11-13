"""
Routing Service - Table lookup and zone mapping.

Academic Project: PATHFLOW - Computer Networks (BCS502) Routing Table Simulation
"""

from typing import Optional, Dict, Any, Tuple
from models import Zone, RoutingRule, Handler

class RoutingTableService:
    @staticmethod
    def get_zone_rule(zone_id: str, category: str) -> Optional[RoutingRule]:
        """Looks up routing table entry for (zone_id, category)."""
        rule = RoutingRule.query.filter_by(zone_id=zone_id, category=category).first()
        if not rule:
            # Fallback to wildcard or primary zone rule
            rule = RoutingRule.query.filter_by(zone_id=zone_id).first()
        return rule

    @staticmethod
    def validate_zone(zone_id: str) -> Tuple[bool, Optional[Zone]]:
        """Checks if ward zone exists and is active."""
        if not zone_id:
            return False, None
        zone = Zone.query.filter_by(zone_id=zone_id, active_status=True).first()
        return (zone is not None), zone

    @staticmethod
    def get_all_routes():
        """Returns all routing table entries with handler details."""
        rules = RoutingRule.query.all()
        result = []
        for r in rules:
            primary = Handler.query.filter_by(handler_id=r.primary_handler_id).first() if r.primary_handler_id else None
            backup = Handler.query.filter_by(handler_id=r.backup_handler_id).first() if r.backup_handler_id else None
            zone = Zone.query.filter_by(zone_id=r.zone_id).first()
            result.append({
                'routing_rule_id': r.routing_rule_id,
                'zone_id': r.zone_id,
                'zone_name': zone.zone_name if zone else r.zone_id,
                'category': r.category,
                'primary_handler': primary.to_dict() if primary else None,
                'backup_handler': backup.to_dict() if backup else None,
                'destination_queue': r.destination_queue,
                'priority': r.priority
            })
        return result

routing_service = RoutingTableService()
