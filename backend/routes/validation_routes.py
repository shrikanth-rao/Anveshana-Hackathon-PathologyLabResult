from flask import Blueprint, request, jsonify
from services.validator import validator_service
from services.dfa import patient_dfa
from config import Config

validation_bp = Blueprint('validation_bp', __name__)

@validation_bp.route('/api/validation/dfa', methods=['POST'])
def validate_dfa():
    """Runs input string character-by-character through DFA and returns execution trace."""
    data = request.get_json() or {}
    patient_id = data.get('patient_id', '').strip()
    result = patient_dfa.process(patient_id)
    return jsonify(result), 200

@validation_bp.route('/api/validation/regex', methods=['POST'])
def validate_regex():
    """Validates patient ID using independent regex."""
    data = request.get_json() or {}
    patient_id = data.get('patient_id', '').strip()
    result = validator_service.validate_with_regex(patient_id)
    return jsonify(result), 200

@validation_bp.route('/api/validation/compare', methods=['POST'])
def compare_validation():
    """Compares independent DFA and Regex validation results."""
    data = request.get_json() or {}
    patient_id = data.get('patient_id', '').strip()
    result = validator_service.compare_validation(patient_id)
    return jsonify(result), 200

@validation_bp.route('/api/validation/report-types', methods=['GET'])
def get_supported_report_types():
    """Returns configurable list of accepted pathology report types."""
    return jsonify({
        'supported_types': Config.SUPPORTED_REPORT_TYPES,
        'code_map': Config.CODE_TO_CATEGORY
    }), 200
