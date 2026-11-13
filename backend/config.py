import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'pathflow-super-secret-key-2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'pathflow.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SLA_CRITICAL_MINUTES = 15
    SLA_STAT_MINUTES = 15

    # Configurable supported report types
    SUPPORTED_REPORT_TYPES = [
        {"code": "CBC", "name": "Complete Blood Count", "default_urgency": "Routine"},
        {"code": "BMP", "name": "Basic Metabolic Panel", "default_urgency": "Routine"},
        {"code": "CMP", "name": "Comprehensive Metabolic Panel", "default_urgency": "Routine"},
        {"code": "LFT", "name": "Liver Function Tests", "default_urgency": "Routine"},
        {"code": "KFT", "name": "Kidney Function Tests", "default_urgency": "Routine"},
        {"code": "TROP", "name": "Troponin Cardiac Biomarker", "default_urgency": "Critical"},
        {"code": "ABG", "name": "Arterial Blood Gas", "default_urgency": "Stat"},
        {"code": "LIPID", "name": "Lipid Profile Panel", "default_urgency": "Routine"},
        {"code": "COAG", "name": "Coagulation PT/INR", "default_urgency": "Stat"},
        {"code": "CULT", "name": "Blood Culture & Sensitivity", "default_urgency": "Pending"},
        {"code": "HIST", "name": "Histopathology Biopsy", "default_urgency": "Pending"},
        {"code": "TOX", "name": "Toxicology Panel Screen", "default_urgency": "Stat"},
        {"code": "URINE", "name": "Urinalysis Microscopic", "default_urgency": "Routine"},
        {"code": "COVID", "name": "Rapid Antigen RT-PCR", "default_urgency": "Stat"}
    ]

    # Classification demonstration mappings
    CODE_TO_CATEGORY = {
        "CRIT": "Critical",
        "STAT": "Stat",
        "ROUT": "Routine",
        "PEND": "Pending"
    }

    CATEGORY_PRIORITIES = {
        "Critical": 1,
        "Stat": 2,
        "Routine": 3,
        "Pending": 99,
        "Error": 100
    }
