import os
import sys
from datetime import datetime, timezone, timedelta
import uuid

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask
from config import Config
from database import db
from models import User, Zone, Handler, RoutingRule, Report, AssignmentHistory, DispatchEvent

def seed_database():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        # Clean slate or re-seed
        db.create_all()

        if User.query.first():
            print("Database already contains data. Clearing existing records for clean demo seed...")
            DispatchEvent.query.delete()
            AssignmentHistory.query.delete()
            Report.query.delete()
            RoutingRule.query.delete()
            Handler.query.delete()
            Zone.query.delete()
            User.query.delete()
            db.session.commit()

        print("Seeding Users...")
        admin = User(
            user_id="USR-000",
            name="System Administrator",
            email="admin@pathflow.lab",
            role="admin"
        )
        admin.set_password("admin123")

        reporter = User(
            user_id="USR-001",
            name="Alex Rivera, MLS",
            email="reporter@pathflow.lab",
            role="reporter"
        )
        reporter.set_password("reporter123")

        # 8 Duty Doctors
        doctor_data = [
            ("HND-001", "Dr. Marcus Chen", "dr.chen@pathflow.lab", "ZONE_1", "ICU Duty Intensivist", 4, 1),
            ("HND-002", "Dr. Ananya Patel", "dr.patel@pathflow.lab", "ZONE_2", "Emergency Duty Physician", 5, 1),
            ("HND-003", "Dr. Sarah Jenkins", "dr.jenkins@pathflow.lab", "ZONE_3", "Cardiothoracic Registrar", 5, 1),
            ("HND-004", "Dr. Mateo Alvarez", "dr.alvarez@pathflow.lab", "ZONE_4", "Internal Medicine Lead", 6, 0),
            ("HND-005", "Dr. Emily Wong", "dr.wong@pathflow.lab", "ZONE_1", "Backup Intensivist", 4, 0),
            ("HND-006", "Dr. Kelechi Nwosu", "dr.nwosu@pathflow.lab", "ZONE_2", "Backup Trauma Registrar", 5, 0),
            ("HND-007", "Dr. David Miller", "dr.miller@pathflow.lab", "ZONE_3", "Backup Cardiology Fellow", 5, 0),
            ("HND-008", "Dr. Claire Foster", "dr.foster@pathflow.lab", "ZONE_4", "Backup Inpatient Hospitalist", 6, 0),
        ]

        users_to_add = [admin, reporter]
        handlers_to_add = []

        for hid, name, email, zid, role_title, cap, load in doctor_data:
            doc_user = User(
                user_id=f"USR-{hid}",
                name=name,
                email=email,
                role="handler"
            )
            doc_user.set_password("doctor123")
            users_to_add.append(doc_user)

            hnd = Handler(
                handler_id=hid,
                name=name,
                email=email,
                zone_id=zid,
                role=role_title,
                availability="Available",
                capacity=cap,
                current_load=load
            )
            handlers_to_add.append(hnd)

        db.session.add_all(users_to_add)
        db.session.add_all(handlers_to_add)
        db.session.commit()

        print("Seeding Zones...")
        zones = [
            Zone(zone_id="ZONE_1", zone_name="ICU & Critical Care", description="Intensive Care Unit, Trauma Resuscitation, Post-Op Recovery", active_status=True),
            Zone(zone_id="ZONE_2", zone_name="Emergency Department", description="Acute Triage, ED Bays 1-12, Observation Unit", active_status=True),
            Zone(zone_id="ZONE_3", zone_name="Cardiology & Surgery", description="Cardiac Care Unit (CCU), Surgical Stepdown, Cath Lab", active_status=True),
            Zone(zone_id="ZONE_4", zone_name="General Inpatient & Oncology", description="Internal Medicine Wards, Oncology Care, Subacute Care", active_status=True),
        ]
        db.session.add_all(zones)
        db.session.commit()

        print("Seeding Routing Rules...")
        categories = ["Critical", "Stat", "Routine", "Pending", "Error"]
        routing_rules = []
        rule_num = 1
        zone_handler_pairs = [
            ("ZONE_1", "HND-001", "HND-005"),
            ("ZONE_2", "HND-002", "HND-006"),
            ("ZONE_3", "HND-003", "HND-007"),
            ("ZONE_4", "HND-004", "HND-008"),
        ]

        for zid, primary_h, backup_h in zone_handler_pairs:
            for cat in categories:
                q = None
                prio = Config.CATEGORY_PRIORITIES.get(cat, 3)
                if cat == "Pending":
                    q = "VERIFICATION_QUEUE"
                elif cat == "Error":
                    q = "CORRECTION_QUEUE"
                elif cat == "Critical":
                    q = "CRITICAL_DISPATCH"
                elif cat == "Stat":
                    q = "STAT_DISPATCH"
                else:
                    q = "ROUTINE_QUEUE"

                rr = RoutingRule(
                    routing_rule_id=f"RR-{rule_num:03d}",
                    zone_id=zid,
                    category=cat,
                    primary_handler_id=primary_h if cat in ["Critical", "Stat", "Routine"] else None,
                    backup_handler_id=backup_h if cat in ["Critical", "Stat", "Routine"] else None,
                    destination_queue=q,
                    priority=prio
                )
                routing_rules.append(rr)
                rule_num += 1

        db.session.add_all(routing_rules)
        db.session.commit()

        print("Seeding Sample Reports & Histories...")
        now = datetime.now(timezone.utc)
        sub1 = now - timedelta(minutes=5)
        sub2 = now - timedelta(minutes=8)
        sub3 = now - timedelta(minutes=12)
        sub4 = now - timedelta(minutes=25)
        sub5 = now - timedelta(minutes=30)
        sub6 = now - timedelta(minutes=45)

        r1 = Report(
            report_id="REP-1001",
            patient_id="PAT102938-LABNY",
            report_type="TROP",
            report_code="CRIT",
            zone_id="ZONE_1",
            description="Serum Troponin I elevated at 4.82 ng/mL (Reference: < 0.04 ng/mL). Consistent with acute myocardial infarction.",
            reporter_id="USR-001",
            category="Critical",
            priority=1,
            validation_status="VALID",
            validation_reason="Accepted by DFA (state q15) and Regex.",
            workflow_status="Assigned",
            assigned_handler_id="HND-001",
            submitted_at=sub1,
            sla_deadline=sub1 + timedelta(minutes=15),
            assigned_at=sub1 + timedelta(seconds=12),
            sla_breached=False
        )

        r2 = Report(
            report_id="REP-1002",
            patient_id="PAT884920-LABCA",
            report_type="COAG",
            report_code="STAT",
            zone_id="ZONE_2",
            description="Stat Coagulation Panel: Prothrombin Time (PT) 38.4s, INR 4.2. Critical bleeding risk in active trauma resuscitation.",
            reporter_id="USR-001",
            category="Stat",
            priority=2,
            validation_status="VALID",
            validation_reason="Accepted by DFA (state q15) and Regex.",
            workflow_status="In Progress",
            assigned_handler_id="HND-002",
            submitted_at=sub2,
            sla_deadline=sub2 + timedelta(minutes=15),
            assigned_at=sub2 + timedelta(seconds=18),
            sla_breached=False
        )

        r3 = Report(
            report_id="REP-1003",
            patient_id="PAT445129-LABTX",
            report_type="CBC",
            report_code="ROUT",
            zone_id="ZONE_3",
            description="Routine CBC: Hemoglobin 13.5 g/dL, WBC 7.2 x 10^3/uL, Platelets 220 x 10^3/uL. Normal pre-op baseline.",
            reporter_id="USR-001",
            category="Routine",
            priority=3,
            validation_status="VALID",
            validation_reason="Accepted by DFA (state q15) and Regex.",
            workflow_status="Assigned",
            assigned_handler_id="HND-003",
            submitted_at=sub3,
            sla_deadline=None,
            assigned_at=sub3 + timedelta(seconds=24),
            sla_breached=False
        )

        r4 = Report(
            report_id="REP-1004",
            patient_id="PAT771024-LABIL",
            report_type="CULT",
            report_code="PEND",
            zone_id="ZONE_4",
            description="Blood culture bottle 1 of 2 flagging preliminary Gram-positive cocci clusters. Awaiting 24h subculture identification.",
            reporter_id="USR-001",
            category="Pending",
            priority=99,
            validation_status="VALID",
            validation_reason="Accepted by DFA (state q15) and Regex.",
            workflow_status="Pending",
            assigned_handler_id=None,
            submitted_at=sub4,
            sla_deadline=None,
            assigned_at=None,
            sla_breached=False
        )

        r5 = Report(
            report_id="REP-1005",
            patient_id="PAT992831-LABFL",
            report_type="CMP",
            report_code="UNKNOWN_X",
            zone_id="ZONE_2",
            description="Specimen hemolyzed during automated aspiration. Unmapped code UNKNOWN_X triggered safety correction queue.",
            reporter_id="USR-001",
            category="Error",
            priority=100,
            validation_status="VALID",
            validation_reason="Patient ID valid. Code unrecognized.",
            workflow_status="Pending",
            assigned_handler_id=None,
            submitted_at=sub5,
            sla_deadline=None,
            assigned_at=None,
            sla_breached=False
        )

        r6 = Report(
            report_id="REP-1000",
            patient_id="PAT619283-LABWA",
            report_type="BMP",
            report_code="ROUT",
            zone_id="ZONE_1",
            description="Basic Metabolic Panel: Glucose 98 mg/dL, Potassium 4.1 mEq/L, Sodium 139 mEq/L. Reviewed and signed off.",
            reporter_id="USR-001",
            category="Routine",
            priority=3,
            validation_status="VALID",
            validation_reason="Accepted by DFA and Regex.",
            workflow_status="Resolved",
            assigned_handler_id="HND-001",
            submitted_at=sub6,
            sla_deadline=None,
            assigned_at=sub6 + timedelta(seconds=15),
            resolved_at=sub6 + timedelta(minutes=15),
            sla_breached=False
        )

        sample_reports = [r1, r2, r3, r4, r5, r6]
        db.session.add_all(sample_reports)
        db.session.commit()

        # Assignment histories & events
        histories = [
            AssignmentHistory(
                assignment_id="ASN-0001",
                report_id="REP-1001",
                previous_handler_id=None,
                assigned_handler_id="HND-001",
                assignment_type="PRIMARY",
                assignment_reason="Standard primary assignment for ZONE_1 [Critical]",
                timestamp=sub1 + timedelta(seconds=12),
                status="Assigned"
            ),
            AssignmentHistory(
                assignment_id="ASN-0002",
                report_id="REP-1002",
                previous_handler_id=None,
                assigned_handler_id="HND-002",
                assignment_type="PRIMARY",
                assignment_reason="Standard primary assignment for ZONE_2 [Stat]",
                timestamp=sub2 + timedelta(seconds=18),
                status="Assigned"
            ),
            AssignmentHistory(
                assignment_id="ASN-0003",
                report_id="REP-1003",
                previous_handler_id=None,
                assigned_handler_id="HND-003",
                assignment_type="PRIMARY",
                assignment_reason="Standard primary assignment for ZONE_3 [Routine]",
                timestamp=sub3 + timedelta(seconds=24),
                status="Assigned"
            ),
        ]
        db.session.add_all(histories)

        events = [
            DispatchEvent(
                event_id="EVT-0001",
                report_id="REP-1001",
                event_type="PRIMARY_ASSIGNED",
                event_description="Dispatched to Dr. Marcus Chen (HND-001) in ZONE_1 with Critical SLA timer active.",
                priority=1,
                timestamp=sub1 + timedelta(seconds=12)
            ),
            DispatchEvent(
                event_id="EVT-0002",
                report_id="REP-1002",
                event_type="PRIMARY_ASSIGNED",
                event_description="Dispatched to Dr. Ananya Patel (HND-002) in ZONE_2 under Stat protocol.",
                priority=2,
                timestamp=sub2 + timedelta(seconds=18)
            ),
        ]
        db.session.add_all(events)
        db.session.commit()

        print("Seeding completed successfully!")

if __name__ == '__main__':
    seed_database()
