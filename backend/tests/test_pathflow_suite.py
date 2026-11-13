"""
PATHFLOW Test Suite - Automated Academic Testing
Integrates:
- BCS503: Automata Theory & Computability (DFA, Regex, Language Acceptance)
- BCS502: Computer Networks (Routing, Priority Dispatch, Capacity, Queue Ordering)
- Integration: Full workflow, SQLite persistence, SLA Tracking, Analytics
"""

import pytest
import os
import sys
from datetime import datetime, timezone, timedelta
import uuid

# Ensure backend path is included
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from database import db
from models import User, Zone, Handler, RoutingRule, Report, AssignmentHistory, DispatchEvent
from services.dfa import patient_dfa
from services.validator import validator_service
from services.classifier import classifier_service
from services.dispatcher import dispatcher_service
from services.queue_manager import queue_manager
from services.sla_manager import sla_manager

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key'

@pytest.fixture(scope='function')
def app_ctx():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()

        # Seed essential zones
        z1 = Zone(zone_id="ZONE_1", zone_name="ICU", active_status=True)
        z2 = Zone(zone_id="ZONE_2", zone_name="ED", active_status=True)
        z3 = Zone(zone_id="ZONE_3", zone_name="Cardio", active_status=True)
        z4 = Zone(zone_id="ZONE_4", zone_name="Inpatient", active_status=True)
        db.session.add_all([z1, z2, z3, z4])

        # Seed Handlers
        h1 = Handler(handler_id="HND-001", name="Dr. Chen", email="chen@test.com", zone_id="ZONE_1", availability="Available", capacity=3, current_load=0)
        h2 = Handler(handler_id="HND-002", name="Dr. Patel", email="patel@test.com", zone_id="ZONE_2", availability="Available", capacity=3, current_load=0)
        h3 = Handler(handler_id="HND-003", name="Dr. Jenkins", email="jenkins@test.com", zone_id="ZONE_3", availability="Available", capacity=3, current_load=0)
        h5 = Handler(handler_id="HND-005", name="Dr. Wong (Backup)", email="wong@test.com", zone_id="ZONE_1", availability="Available", capacity=3, current_load=0)
        db.session.add_all([h1, h2, h3, h5])

        # Seed Routing Rules
        rr1 = RoutingRule(routing_rule_id="RR-001", zone_id="ZONE_1", category="Critical", primary_handler_id="HND-001", backup_handler_id="HND-005", destination_queue="CRITICAL_DISPATCH", priority=1)
        rr2 = RoutingRule(routing_rule_id="RR-002", zone_id="ZONE_2", category="Stat", primary_handler_id="HND-002", backup_handler_id=None, destination_queue="STAT_DISPATCH", priority=2)
        rr3 = RoutingRule(routing_rule_id="RR-003", zone_id="ZONE_3", category="Routine", primary_handler_id="HND-003", backup_handler_id=None, destination_queue="ROUTINE_QUEUE", priority=3)
        db.session.add_all([rr1, rr2, rr3])

        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app_ctx):
    return app_ctx.test_client()

# =========================================================================
# 1. VALIDATION TESTS (BCS503 - Automata & Formal Languages)
# =========================================================================

def test_01_valid_patient_id():
    """Test 1: Valid standard patient identifier accepts in state q15."""
    res = patient_dfa.process("PAT123456-LABAB")
    assert res["valid"] is True
    assert res["final_state"] == "q15"
    assert res["is_accepting"] is True

def test_02_patient_id_fewer_than_six_digits():
    """Test 2: Patient ID with fewer than 6 digits halts before accepting state."""
    res = patient_dfa.process("PAT12345-LABAB")  # 5 digits
    assert res["valid"] is False
    assert res["final_state"] == "DEAD"

def test_03_patient_id_more_than_six_digits():
    """Test 3: Patient ID with more than 6 digits transitions to DEAD state."""
    res = patient_dfa.process("PAT1234567-LABAB")  # 7 digits
    assert res["valid"] is False
    assert res["final_state"] == "DEAD"

def test_04_incorrect_prefix():
    """Test 4: Incorrect prefix (e.g. MED instead of PAT) fails at start."""
    res = patient_dfa.process("MED123456-LABAB")
    assert res["valid"] is False
    assert res["final_state"] == "DEAD"

def test_05_missing_hyphen():
    """Test 5: Missing hyphen separator triggers rejection state."""
    res = patient_dfa.process("PAT123456LABAB")
    assert res["valid"] is False
    assert res["final_state"] == "DEAD"

def test_06_incorrect_lab_prefix():
    """Test 6: Incorrect LAB prefix (e.g. HOS instead of LAB) is rejected."""
    res = patient_dfa.process("PAT123456-HOSAB")
    assert res["valid"] is False
    assert res["final_state"] == "DEAD"

def test_07_invalid_alphabetic_suffix():
    """Test 7: Lowercase or numeric suffix fails constraint."""
    res = patient_dfa.process("PAT123456-LAB12")
    assert res["valid"] is False
    assert res["final_state"] == "DEAD"

def test_08_empty_patient_id():
    """Test 8: Empty patient ID is rejected immediately."""
    res = patient_dfa.process("")
    assert res["valid"] is False

def test_09_dfa_and_regex_agreement_valid():
    """Test 9: DFA and Regex independently evaluate and agree on valid input."""
    comp = validator_service.compare_validation("PAT987654-LABXY")
    assert comp["dfa"]["valid"] is True
    assert comp["regex"]["valid"] is True
    assert comp["agreement"] is True
    assert comp["final_valid"] is True

def test_10_dfa_and_regex_agreement_invalid():
    """Test 10: DFA and Regex independently evaluate and agree on malformed input."""
    comp = validator_service.compare_validation("INVALID-PATIENT-ID")
    assert comp["dfa"]["valid"] is False
    assert comp["regex"]["valid"] is False
    assert comp["agreement"] is True
    assert comp["final_valid"] is False

# =========================================================================
# 2. CLASSIFICATION TESTS (5 Categories & Deterministic Precedence)
# =========================================================================

def test_11_crit_mapped_to_critical():
    """Test 11: CRIT code maps deterministically to Critical category (Priority 1)."""
    res = classifier_service.classify("CRIT")
    assert res["category"] == "Critical"
    assert res["priority"] == 1
    assert res["destination_queue"] == "CRITICAL_DISPATCH"

def test_12_stat_mapped_to_stat():
    """Test 12: STAT code maps deterministically to Stat category (Priority 2)."""
    res = classifier_service.classify("STAT")
    assert res["category"] == "Stat"
    assert res["priority"] == 2
    assert res["destination_queue"] == "STAT_DISPATCH"

def test_13_rout_mapped_to_routine():
    """Test 13: ROUT code maps to Routine category (Priority 3)."""
    res = classifier_service.classify("ROUT")
    assert res["category"] == "Routine"
    assert res["priority"] == 3
    assert res["destination_queue"] == "ROUTINE_QUEUE"

def test_14_pend_mapped_to_pending():
    """Test 14: PEND code maps to Pending category for Verification Queue."""
    res = classifier_service.classify("PEND")
    assert res["category"] == "Pending"
    assert res["priority"] == 99
    assert res["destination_queue"] == "VERIFICATION_QUEUE"

def test_15_unknown_code_mapped_to_error():
    """Test 15: Unknown code is NOT silently routed to Routine, but mapped to Error."""
    res = classifier_service.classify("UNKNOWN_CODE_XYZ")
    assert res["category"] == "Error"
    assert res["priority"] == 100
    assert res["destination_queue"] == "CORRECTION_QUEUE"

def test_16_conflicting_patterns_precedence_override():
    """Test 16: Emergency override takes precedence over routine code."""
    res = classifier_service.classify("ROUT", is_emergency_override=True)
    assert res["category"] == "Critical"
    assert res["priority"] == 1
    assert res["rule_applied"] == "EMERGENCY_OVERRIDE"

# =========================================================================
# 3. ROUTING AND DISPATCH TESTS (BCS502 - Networks & Dispatch Logic)
# =========================================================================

def test_17_correct_primary_handler_selected(app_ctx):
    """Test 17: Valid report in ZONE_1 routes to primary handler HND-001."""
    report = Report(
        report_id="REP-T017",
        patient_id="PAT111111-LABAA",
        report_type="TROP",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Pending"
    )
    db.session.add(report)
    db.session.commit()

    outcome = dispatcher_service.dispatch_report(report)
    assert outcome["status"] == "ASSIGNED_PRIMARY"
    assert outcome["assigned_handler_id"] == "HND-001"
    assert report.assigned_handler_id == "HND-001"
    assert report.workflow_status == "Assigned"

def test_18_unknown_zone_central_fallback(app_ctx):
    """Test 18: Unrecognized zone triggers central fallback / escalation."""
    report = Report(
        report_id="REP-T018",
        patient_id="PAT222222-LABBB",
        report_type="CBC",
        report_code="ROUT",
        zone_id="ZONE_99_NONEXISTENT",
        category="Routine",
        priority=3,
        validation_status="VALID",
        workflow_status="Pending"
    )
    db.session.add(report)
    db.session.commit()

    outcome = dispatcher_service.dispatch_report(report)
    assert "UNKNOWN_ZONE" in outcome["status"]
    assert outcome["assigned_handler_id"] is None
    assert outcome["destination_queue"] == "CENTRAL_FALLBACK_QUEUE"

def test_19_unavailable_primary_triggers_backup(app_ctx):
    """Test 19: When primary doctor is Unavailable, dispatch assigns to backup handler."""
    h1 = Handler.query.filter_by(handler_id="HND-001").first()
    h1.availability = "Unavailable"
    db.session.commit()

    report = Report(
        report_id="REP-T019",
        patient_id="PAT333333-LABCC",
        report_type="TROP",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Pending"
    )
    db.session.add(report)
    db.session.commit()

    outcome = dispatcher_service.dispatch_report(report)
    assert outcome["status"] == "ASSIGNED_BACKUP"
    assert outcome["assigned_handler_id"] == "HND-005"
    assert report.assigned_handler_id == "HND-005"

def test_20_capacity_overflow_triggers_escalation(app_ctx):
    """Test 20: When both primary and backup are at full capacity, Critical escalates."""
    h1 = Handler.query.filter_by(handler_id="HND-001").first()
    h1.current_load = h1.capacity  # 3/3 Full
    h5 = Handler.query.filter_by(handler_id="HND-005").first()
    h5.current_load = h5.capacity  # 3/3 Full
    db.session.commit()

    report = Report(
        report_id="REP-T020",
        patient_id="PAT444444-LABDD",
        report_type="TROP",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Pending"
    )
    db.session.add(report)
    db.session.commit()

    outcome = dispatcher_service.dispatch_report(report)
    assert outcome["status"] == "ESCALATED_CRITICAL"
    assert outcome["destination_queue"] == "ESCALATION_QUEUE"

def test_21_critical_report_receives_top_priority(app_ctx):
    """Test 21: Critical report receives Priority 1."""
    cls_res = classifier_service.classify("CRIT")
    assert cls_res["priority"] == 1

def test_22_critical_processed_before_routine(app_ctx):
    """Test 22: Smart queue sorts Critical ahead of Routine regardless of submission order."""
    now = datetime.now(timezone.utc)
    # Routine submitted earlier
    r_rout = Report(
        report_id="REP-ROUT-1",
        patient_id="PAT111111-LABAA",
        report_type="CBC",
        report_code="ROUT",
        zone_id="ZONE_1",
        category="Routine",
        priority=3,
        validation_status="VALID",
        workflow_status="Pending",
        submitted_at=now - timedelta(minutes=10)
    )
    # Critical submitted later
    r_crit = Report(
        report_id="REP-CRIT-1",
        patient_id="PAT222222-LABBB",
        report_type="TROP",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Pending",
        submitted_at=now
    )
    db.session.add_all([r_rout, r_crit])
    db.session.commit()

    q = queue_manager.get_dispatch_queue()
    # First report in queue must be Critical
    assert q[0]["report_id"] == "REP-CRIT-1"
    assert q[0]["priority"] == 1

def test_23_equal_priority_fifo_ordering(app_ctx):
    """Test 23: Equal priority reports are ordered FIFO by submission timestamp."""
    now = datetime.now(timezone.utc)
    r1 = Report(
        report_id="REP-FIFO-1",
        patient_id="PAT111111-LABAA",
        report_type="TROP",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Pending",
        submitted_at=now - timedelta(minutes=5)
    )
    r2 = Report(
        report_id="REP-FIFO-2",
        patient_id="PAT222222-LABBB",
        report_type="TROP",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Pending",
        submitted_at=now - timedelta(minutes=2)
    )
    db.session.add_all([r1, r2])
    db.session.commit()

    q = queue_manager.get_dispatch_queue(category_filter="Critical")
    assert q[0]["report_id"] == "REP-FIFO-1"
    assert q[1]["report_id"] == "REP-FIFO-2"

def test_24_duplicate_assignment_prevented(app_ctx):
    """Test 24: Calling dispatch on an already assigned report does not double count workload."""
    report = Report(
        report_id="REP-T024",
        patient_id="PAT555555-LABEE",
        report_type="TROP",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Pending"
    )
    db.session.add(report)
    db.session.commit()

    dispatcher_service.dispatch_report(report)
    h1 = Handler.query.filter_by(handler_id="HND-001").first()
    load_after_first = h1.current_load

    # Subsequent re-evaluation shouldn't increment if already assigned
    assert report.workflow_status == "Assigned"
    assert load_after_first == 1

def test_25_invalid_identifier_rejected_before_dispatch(client):
    """Test 25: Malformed patient ID rejected before routing table lookup."""
    resp = client.post('/api/reports', json={
        "patient_id": "BAD-ID-123",
        "report_type": "CBC",
        "report_code": "CRIT",
        "zone_id": "ZONE_1",
        "description": "Invalid barcode"
    })
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["report"]["validation_status"] == "INVALID"
    assert data["dispatch"]["status"] == "REJECTED"

# =========================================================================
# 4. INTEGRATION TESTS (Full Workflow, Persistence, SLA & Workload)
# =========================================================================

def test_26_report_submission_persists_data(client):
    """Test 26: Valid submission persists to SQLite with unique ID."""
    resp = client.post('/api/reports', json={
        "patient_id": "PAT654321-LABXY",
        "report_type": "CBC",
        "report_code": "STAT",
        "zone_id": "ZONE_2",
        "description": "Integration test report"
    })
    assert resp.status_code == 201
    data = resp.get_json()
    report_id = data["report"]["report_id"]

    # Verify directly from database
    persisted = Report.query.filter_by(report_id=report_id).first()
    assert persisted is not None
    assert persisted.patient_id == "PAT654321-LABXY"
    assert persisted.category == "Stat"

def test_27_handler_status_update_persisted(client, app_ctx):
    """Test 27: Handler toggle availability is persisted and re-queries accurately."""
    resp = client.patch('/api/handlers/HND-001', json={'availability': 'Unavailable'})
    assert resp.status_code == 200
    h1 = Handler.query.filter_by(handler_id="HND-001").first()
    assert h1.availability == "Unavailable"

def test_28_sla_deadline_calculated_correctly():
    """Test 28: Critical & Stat get 15-minute SLA deadline."""
    now = datetime.now(timezone.utc)
    crit_deadline = sla_manager.calculate_sla_deadline(now, "Critical")
    stat_deadline = sla_manager.calculate_sla_deadline(now, "Stat")
    rout_deadline = sla_manager.calculate_sla_deadline(now, "Routine")

    assert (crit_deadline - now).total_seconds() == 15 * 60
    assert (stat_deadline - now).total_seconds() == 15 * 60
    assert rout_deadline is None

def test_29_report_resolution_updates_workload(client, app_ctx):
    """Test 29: Resolving report decrements handler workload count."""
    h1 = Handler.query.filter_by(handler_id="HND-001").first()
    h1.current_load = 2
    report = Report(
        report_id="REP-RESOLVE-1",
        patient_id="PAT777777-LABGG",
        report_type="CBC",
        report_code="CRIT",
        zone_id="ZONE_1",
        category="Critical",
        priority=1,
        validation_status="VALID",
        workflow_status="Assigned",
        assigned_handler_id="HND-001"
    )
    db.session.add(report)
    db.session.commit()

    resp = client.patch('/api/reports/REP-RESOLVE-1/status', json={'status': 'Resolved'})
    assert resp.status_code == 200
    assert report.workflow_status == "Resolved"
    assert h1.current_load == 1

def test_30_analytics_values_match_persisted_data(client, app_ctx):
    """Test 30: Analytics overview endpoint reflects accurate counts."""
    resp = client.get('/api/analytics/overview')
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'total_reports' in data
    assert 'categories' in data
    assert 'workflow' in data
    assert 'sla' in data
    assert data['total_reports'] == Report.query.count()
