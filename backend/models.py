from datetime import datetime, timezone
from database import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin', 'handler', 'reporter'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Zone(db.Model):
    __tablename__ = 'zones'

    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    zone_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    active_status = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'zone_name': self.zone_name,
            'description': self.description,
            'active_status': self.active_status
        }

class Handler(db.Model):
    __tablename__ = 'handlers'

    id = db.Column(db.Integer, primary_key=True)
    handler_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    zone_id = db.Column(db.String(32), db.ForeignKey('zones.zone_id'), nullable=True)
    role = db.Column(db.String(50), default='Duty Doctor')
    availability = db.Column(db.String(20), default='Available')  # 'Available', 'Unavailable'
    capacity = db.Column(db.Integer, default=5)
    current_load = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'handler_id': self.handler_id,
            'name': self.name,
            'email': self.email,
            'zone_id': self.zone_id,
            'role': self.role,
            'availability': self.availability,
            'capacity': self.capacity,
            'current_load': self.current_load,
            'available_capacity': max(0, self.capacity - self.current_load),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RoutingRule(db.Model):
    __tablename__ = 'routing_rules'

    id = db.Column(db.Integer, primary_key=True)
    routing_rule_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    zone_id = db.Column(db.String(32), db.ForeignKey('zones.zone_id'), nullable=False)
    category = db.Column(db.String(32), nullable=False)  # 'Critical', 'Stat', 'Routine', 'Pending', 'Error'
    primary_handler_id = db.Column(db.String(32), db.ForeignKey('handlers.handler_id'), nullable=True)
    backup_handler_id = db.Column(db.String(32), db.ForeignKey('handlers.handler_id'), nullable=True)
    destination_queue = db.Column(db.String(50), nullable=True)
    priority = db.Column(db.Integer, default=1)

    def to_dict(self):
        return {
            'id': self.id,
            'routing_rule_id': self.routing_rule_id,
            'zone_id': self.zone_id,
            'category': self.category,
            'primary_handler_id': self.primary_handler_id,
            'backup_handler_id': self.backup_handler_id,
            'destination_queue': self.destination_queue,
            'priority': self.priority
        }

class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.String(64), nullable=False, index=True)
    report_type = db.Column(db.String(64), nullable=False)
    report_code = db.Column(db.String(32), nullable=False)
    zone_id = db.Column(db.String(32), nullable=True)
    description = db.Column(db.Text, nullable=True)
    reporter_id = db.Column(db.String(32), nullable=True)

    category = db.Column(db.String(32), nullable=False)  # 'Critical', 'Routine', 'Stat', 'Pending', 'Error'
    priority = db.Column(db.Integer, nullable=False, default=3)

    validation_status = db.Column(db.String(20), nullable=False)  # 'VALID', 'INVALID'
    validation_reason = db.Column(db.String(255), nullable=True)

    workflow_status = db.Column(db.String(32), default='Pending')  # 'Pending', 'Assigned', 'In Progress', 'Resolved'
    assigned_handler_id = db.Column(db.String(32), db.ForeignKey('handlers.handler_id'), nullable=True)

    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    sla_deadline = db.Column(db.DateTime, nullable=True)
    assigned_at = db.Column(db.DateTime, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    sla_breached = db.Column(db.Boolean, default=False)

    def to_dict(self):
        now = datetime.now(timezone.utc)
        # Calculate dynamic SLA remaining seconds
        sla_seconds_remaining = None
        if self.sla_deadline and not self.resolved_at:
            deadline = self.sla_deadline.replace(tzinfo=timezone.utc) if self.sla_deadline.tzinfo is None else self.sla_deadline
            diff = (deadline - now).total_seconds()
            sla_seconds_remaining = int(diff)

        is_breached = self.sla_breached
        if not is_breached and self.sla_deadline and not self.resolved_at:
            deadline = self.sla_deadline.replace(tzinfo=timezone.utc) if self.sla_deadline.tzinfo is None else self.sla_deadline
            if now > deadline:
                is_breached = True

        return {
            'id': self.id,
            'report_id': self.report_id,
            'patient_id': self.patient_id,
            'report_type': self.report_type,
            'report_code': self.report_code,
            'zone_id': self.zone_id,
            'description': self.description,
            'reporter_id': self.reporter_id,
            'category': self.category,
            'priority': self.priority,
            'validation_status': self.validation_status,
            'validation_reason': self.validation_reason,
            'workflow_status': self.workflow_status,
            'assigned_handler_id': self.assigned_handler_id,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'sla_deadline': self.sla_deadline.isoformat() if self.sla_deadline else None,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'sla_breached': is_breached,
            'sla_seconds_remaining': sla_seconds_remaining
        }

class AssignmentHistory(db.Model):
    __tablename__ = 'assignment_history'

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    report_id = db.Column(db.String(32), db.ForeignKey('reports.report_id'), nullable=False, index=True)
    previous_handler_id = db.Column(db.String(32), nullable=True)
    assigned_handler_id = db.Column(db.String(32), nullable=True)
    assignment_type = db.Column(db.String(32), nullable=False)  # 'PRIMARY', 'BACKUP', 'ESCALATION', 'FALLBACK', 'WAITING_QUEUE', 'RESOLVED'
    assignment_reason = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(32), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'report_id': self.report_id,
            'previous_handler_id': self.previous_handler_id,
            'assigned_handler_id': self.assigned_handler_id,
            'assignment_type': self.assignment_type,
            'assignment_reason': self.assignment_reason,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'status': self.status
        }

class DispatchEvent(db.Model):
    __tablename__ = 'dispatch_events'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    report_id = db.Column(db.String(32), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)  # 'VALIDATION_FAILED', 'PRIMARY_ASSIGNED', 'BACKUP_ASSIGNED', 'ESCALATED', 'QUEUED', 'STATUS_CHANGED', 'RESOLVED'
    event_description = db.Column(db.String(255), nullable=False)
    priority = db.Column(db.Integer, default=3)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'report_id': self.report_id,
            'event_type': self.event_type,
            'event_description': self.event_description,
            'priority': self.priority,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class SimulationRecord(db.Model):
    __tablename__ = 'simulation_records'

    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    scenario_name = db.Column(db.String(100), nullable=False)
    report_data = db.Column(db.Text, nullable=False)  # JSON string
    result_data = db.Column(db.Text, nullable=False)  # JSON string
    outcome = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'simulation_id': self.simulation_id,
            'scenario_name': self.scenario_name,
            'report_data': json.loads(self.report_data) if self.report_data else {},
            'result_data': json.loads(self.result_data) if self.result_data else {},
            'outcome': self.outcome,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
