from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import json
import uuid

from models import Report, Handler, Zone, RoutingRule
from database import db
from services.validator import validator_service
from services.classifier import classifier_service
from services.dispatcher import dispatcher_service
from services.routing import routing_service

simulation_bp = Blueprint('simulation_bp', __name__)

PREDEFINED_SCENARIOS = [
    {
        "id": "scenario_1",
        "name": "Normal Dispatch (Primary Available)",
        "description": "Standard Critical report in ZONE_1 where primary intensivist is Available with capacity.",
        "payload": {
            "patient_id": "PAT112233-LABNY",
            "report_type": "TROP",
            "report_code": "CRIT",
            "zone_id": "ZONE_1",
            "description": "Troponin I elevation 3.4 ng/mL in ICU bed 4.",
            "simulate_primary_avail": "Available",
            "simulate_primary_load": 1,
            "simulate_primary_cap": 4,
            "simulate_backup_avail": "Available",
            "simulate_backup_load": 0,
            "simulate_backup_cap": 4
        }
    },
    {
        "id": "scenario_2",
        "name": "Primary Unavailable (Backup Fallback)",
        "description": "Primary doctor marked Unavailable. Dispatch algorithm falls back to designated backup handler.",
        "payload": {
            "patient_id": "PAT334455-LABED",
            "report_type": "COAG",
            "report_code": "STAT",
            "zone_id": "ZONE_2",
            "description": "Stat Coagulation INR 4.6 in ED trauma room.",
            "simulate_primary_avail": "Unavailable",
            "simulate_primary_load": 2,
            "simulate_primary_cap": 5,
            "simulate_backup_avail": "Available",
            "simulate_backup_load": 1,
            "simulate_backup_cap": 5
        }
    },
    {
        "id": "scenario_3",
        "name": "Capacity Exceeded (Saturation & Escalation)",
        "description": "Both primary and backup doctors have reached maximum active capacity. Critical report escalates.",
        "payload": {
            "patient_id": "PAT556677-LABIC",
            "report_type": "ABG",
            "report_code": "CRIT",
            "zone_id": "ZONE_1",
            "description": "Severe acidosis pH 7.12, pCO2 68 mmHg in ICU.",
            "simulate_primary_avail": "Available",
            "simulate_primary_load": 4,
            "simulate_primary_cap": 4,
            "simulate_backup_avail": "Available",
            "simulate_backup_load": 4,
            "simulate_backup_cap": 4
        }
    },
    {
        "id": "scenario_4",
        "name": "Unknown Ward Zone (Central Fallback)",
        "description": "Report submitted with invalid/unregistered ward zone. Triggers central fallback and escalation.",
        "payload": {
            "patient_id": "PAT778899-LABUN",
            "report_type": "BMP",
            "report_code": "STAT",
            "zone_id": "ZONE_UNKNOWN_99",
            "description": "Stat metabolic panel submitted with unknown ward tag.",
            "simulate_primary_avail": "Available",
            "simulate_primary_load": 0,
            "simulate_primary_cap": 5,
            "simulate_backup_avail": "Available",
            "simulate_backup_load": 0,
            "simulate_backup_cap": 5
        }
    },
    {
        "id": "scenario_5",
        "name": "Multiple Incoming Reports (Priority Ordering)",
        "description": "Evaluates queue ordering when Critical, Stat, and Routine reports arrive simultaneously.",
        "payload": {
            "batch": [
                {"patient_id": "PAT111111-LABAA", "report_type": "CBC", "report_code": "ROUT", "zone_id": "ZONE_3"},
                {"patient_id": "PAT222222-LABBB", "report_type": "TROP", "report_code": "CRIT", "zone_id": "ZONE_1"},
                {"patient_id": "PAT333333-LABCC", "report_type": "COAG", "report_code": "STAT", "zone_id": "ZONE_2"}
            ]
        }
    },
    {
        "id": "scenario_6",
        "name": "Emergency Clinical Override",
        "description": "Laboratory user flags an explicit critical clinical override, preempting routine queue.",
        "payload": {
            "patient_id": "PAT444444-LABDD",
            "report_type": "CBC",
            "report_code": "ROUT",
            "zone_id": "ZONE_4",
            "description": "Severe acute leukemia blast crisis suspected. Overridden to Critical.",
            "is_emergency_override": True,
            "simulate_primary_avail": "Available",
            "simulate_primary_load": 1,
            "simulate_primary_cap": 6,
            "simulate_backup_avail": "Available",
            "simulate_backup_load": 0,
            "simulate_backup_cap": 6
        }
    },
    {
        "id": "scenario_7",
        "name": "Invalid Patient Identifier (DFA Rejection)",
        "description": "Malformed patient ID (missing letters or invalid digit count) rejected before routing lookup.",
        "payload": {
            "patient_id": "PAT1234-LABX",  # Only 4 digits, 1 letter -> DFA DEAD state
            "report_type": "CBC",
            "report_code": "CRIT",
            "zone_id": "ZONE_1",
            "description": "Sample submitted with corrupted barcode identifier."
        }
    }
]

@simulation_bp.route('/api/simulations/scenarios', methods=['GET'])
def get_scenarios():
    """Returns the 7 predefined academic demonstration scenarios."""
    return jsonify({'scenarios': PREDEFINED_SCENARIOS}), 200

@simulation_bp.route('/api/simulations/run', methods=['POST'])
def run_simulation():
    """
    Runs report simulation through the actual backend validator, classifier, and dispatcher.
    Returns visual telemetry step-by-step for the interactive simulation lab!
    """
    data = request.get_json() or {}
    now = datetime.now(timezone.utc)

    # Batch scenario handling
    if 'batch' in data:
        batch_results = []
        for item in data['batch']:
            # Validate
            is_valid, reason, comp = validator_service.validate_report_submission(item)
            cls_res = classifier_service.classify(item.get('report_code', 'ROUT'))
            batch_results.append({
                "patient_id": item.get('patient_id'),
                "report_code": item.get('report_code'),
                "zone_id": item.get('zone_id'),
                "is_valid": is_valid,
                "category": cls_res['category'],
                "priority": cls_res['priority'],
                "queue": cls_res['destination_queue']
            })
        # Sort by priority ASC
        sorted_batch = sorted(batch_results, key=lambda x: x['priority'])
        return jsonify({
            "scenario": "batch_priority",
            "simulation_mode": True,
            "batch_input": data['batch'],
            "sorted_queue_dispatch": sorted_batch,
            "explanation": "Deterministic queue ordering arranged Critical (P1) ahead of Stat (P2) and Routine (P3)."
        }), 200

    patient_id = data.get('patient_id', '').strip()
    report_type = data.get('report_type', 'CBC').strip()
    report_code = data.get('report_code', 'CRIT').strip()
    zone_id = data.get('zone_id', 'ZONE_1').strip()
    description = data.get('description', 'Simulation test report').strip()
    is_emergency = bool(data.get('is_emergency_override', False))

    sim_report_id = f"SIM-{uuid.uuid4().hex[:6].upper()}"

    # Step 1: Validation
    is_valid, val_reason, val_comp = validator_service.validate_report_submission(data)
    validation_status = 'VALID' if is_valid else 'INVALID'

    telemetry = {
        "report_id": sim_report_id,
        "patient_id": patient_id,
        "zone_id": zone_id,
        "report_code": report_code,
        "is_valid": is_valid,
        "validation_summary": {
            "dfa_state": val_comp['dfa']['final_state'],
            "regex_valid": val_comp['regex']['valid'],
            "agreement": val_comp['agreement'],
            "reason": val_reason
        },
        "stages": []
    }

    telemetry["stages"].append({
        "stage": "1. Validation",
        "status": "PASSED" if is_valid else "FAILED",
        "details": f"DFA State: {val_comp['dfa']['final_state']}, Regex Match: {val_comp['regex']['valid']}. {val_reason}"
    })

    if not is_valid:
        telemetry["stages"].append({
            "stage": "2. Pre-Dispatch Guard",
            "status": "HALTED",
            "details": "Malformed identifier halted at gate. Routing table lookup blocked to prevent erroneous clinical assignments."
        })
        telemetry["final_outcome"] = {
            "status": "REJECTED_BEFORE_DISPATCH",
            "destination": "REJECTION_LOG",
            "assigned_handler": None,
            "explanation": "Report safely rejected. No doctors disturbed."
        }
        return jsonify(telemetry), 200

    # Step 2: Classification
    classification = classifier_service.classify(report_code, is_emergency_override=is_emergency)
    category = classification['category']
    priority = classification['priority']

    telemetry["stages"].append({
        "stage": "2. Classification",
        "status": "COMPLETED",
        "details": f"Classified as '{category}' with numeric Priority {priority} via rule '{classification['rule_applied']}'."
    })

    # Step 3: Zone Lookup
    is_zone_valid, zone = routing_service.validate_zone(zone_id)
    if not is_zone_valid:
        is_urgent = category in ["Critical", "Stat"]
        telemetry["stages"].append({
            "stage": "3. Zone Lookup",
            "status": "UNKNOWN_ZONE",
            "details": f"Zone '{zone_id}' not found in active routing directory."
        })
        telemetry["stages"].append({
            "stage": "4. Fallback / Escalation",
            "status": "ESCALATED" if is_urgent else "FALLBACK",
            "details": "Preserved clinical urgency and routed to Central Dispatch Escalation Queue." if is_urgent else "Routed to Central Fallback Queue for correction."
        })
        telemetry["final_outcome"] = {
            "status": "ESCALATED_UNKNOWN_ZONE" if is_urgent else "FALLBACK_UNKNOWN_ZONE",
            "destination": "CENTRAL_ESCALATION_QUEUE" if is_urgent else "CENTRAL_FALLBACK_QUEUE",
            "assigned_handler": None,
            "explanation": f"Unknown ward zone handled gracefully without data loss."
        }
        return jsonify(telemetry), 200

    telemetry["stages"].append({
        "stage": "3. Zone Lookup",
        "status": "MATCHED",
        "details": f"Zone matched: {zone.zone_name} ({zone.zone_id}). Inspecting designated duty doctor rules."
    })

    # Step 4: Routing Rule Inspection
    rule = routing_service.get_zone_rule(zone_id, category)
    primary_id = rule.primary_handler_id if rule else None
    backup_id = rule.backup_handler_id if rule else None

    # Allow simulation payload overrides for testing availability & capacity scenarios
    sim_primary_avail = data.get('simulate_primary_avail', 'Available')
    sim_primary_load = int(data.get('simulate_primary_load', 1))
    sim_primary_cap = int(data.get('simulate_primary_cap', 4))

    sim_backup_avail = data.get('simulate_backup_avail', 'Available')
    sim_backup_load = int(data.get('simulate_backup_load', 0))
    sim_backup_cap = int(data.get('simulate_backup_cap', 4))

    # Evaluate Primary
    primary_eligible = (sim_primary_avail == 'Available') and (sim_primary_load < sim_primary_cap)
    telemetry["stages"].append({
        "stage": "4. Primary Handler Evaluation",
        "handler_id": primary_id,
        "availability": sim_primary_avail,
        "workload": f"{sim_primary_load}/{sim_primary_cap}",
        "status": "ELIGIBLE" if primary_eligible else "INELIGIBLE",
        "details": f"Primary doctor is Available and under capacity." if primary_eligible else f"Primary doctor unavailable or full ({sim_primary_avail}, {sim_primary_load}/{sim_primary_cap})."
    })

    if primary_eligible:
        telemetry["final_outcome"] = {
            "status": "ASSIGNED_PRIMARY",
            "destination": f"Primary Duty Doctor ({primary_id})",
            "assigned_handler": primary_id,
            "explanation": f"Directly dispatched to primary duty doctor for {zone_id}."
        }
        return jsonify(telemetry), 200

    # Evaluate Backup
    backup_eligible = (sim_backup_avail == 'Available') and (sim_backup_load < sim_backup_cap)
    telemetry["stages"].append({
        "stage": "5. Backup Handler Evaluation",
        "handler_id": backup_id,
        "availability": sim_backup_avail,
        "workload": f"{sim_backup_load}/{sim_backup_cap}",
        "status": "ELIGIBLE" if backup_eligible else "INELIGIBLE",
        "details": f"Backup handler is Available with spare capacity." if backup_eligible else f"Backup handler also saturated or unavailable ({sim_backup_avail}, {sim_backup_load}/{sim_backup_cap})."
    })

    if backup_eligible:
        telemetry["final_outcome"] = {
            "status": "ASSIGNED_BACKUP",
            "destination": f"Backup Duty Doctor ({backup_id})",
            "assigned_handler": backup_id,
            "explanation": f"Primary bypassed due to saturation/unavailability. Successfully routed to designated backup."
        }
        return jsonify(telemetry), 200

    # Step 6: Escalation / Waiting Queue
    if category == "Critical":
        telemetry["stages"].append({
            "stage": "6. Escalation Protocol",
            "status": "CRITICAL_ESCALATION",
            "details": "Both primary and backup handlers unavailable for CRITICAL report. Elevating immediately to Chief Medical Officer / Escalation Queue."
        })
        telemetry["final_outcome"] = {
            "status": "ESCALATED_CRITICAL",
            "destination": "EMERGENCY_ESCALATION_QUEUE",
            "assigned_handler": None,
            "explanation": "Critical report escalated to emergency supervisor queue with top priority."
        }
    else:
        telemetry["stages"].append({
            "stage": "6. Priority Waiting Queue",
            "status": "QUEUED",
            "details": f"Report placed in {category} waiting queue awaiting duty doctor availability."
        })
        telemetry["final_outcome"] = {
            "status": f"WAITING_QUEUE_{category.upper()}",
            "destination": f"{category.upper()}_WAITING_QUEUE",
            "assigned_handler": None,
            "explanation": f"Preserved priority {priority}. Will be re-evaluated as soon as doctor load decreases."
        }

    return jsonify(telemetry), 200
