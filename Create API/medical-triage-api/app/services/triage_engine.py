import uuid
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.symptom_normalizer import normalizer
from app.database import supabase_client

class TriageEngine:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent.parent / "seed"
        self.rules = self._load_rules()

    def _load_rules(self):
        file_path = self.base_dir / "symptoms.json"
        if not file_path.exists():
            return {}
        with open(file_path, 'r', encoding='utf-8') as f:
            symptoms_list = json.load(f)
            return {s["id"]: s for s in symptoms_list}
            
    def determine_triage(self, symptoms: List[str]):
        emergency_flags = []

        for symptom in symptoms:
            rule = self.rules.get(symptom)

            if rule and rule.get("red_flag") is True:
                emergency_flags.append(rule["id"])

        if emergency_flags:
            return {
                "triage_level": "EMERGENCY",
                "red_flag": True,
                "matched_red_flags": emergency_flags,
                "reasons": [self.rules[flag]["name"] for flag in emergency_flags]
            }

        return {
            "triage_level": "NON_URGENT",
            "red_flag": False,
            "matched_red_flags": [],
            "reasons": []
        }

    def process_triage(self, request: TriageRequest, patient_id: Optional[str] = None) -> TriageResponse:
        # 1. Normalize Symptoms
        normalized_symptoms = []
        for raw_symptom in request.symptoms:
            norm = normalizer.normalize(raw_symptom)
            if norm:
                normalized_symptoms.append(norm)
            else:
                # If we can't normalize, we evaluate the raw string after basic cleaning
                normalized_symptoms.append(raw_symptom.lower().strip().replace(" ", "_"))

        # 2. Evaluate Red Flags
        evaluation = self.determine_triage(normalized_symptoms)

        emergency = evaluation["red_flag"]
        matched_flags = evaluation["matched_red_flags"]
        reasons = evaluation.get("reasons", [])
        
        # 3. Formulate Response
        if emergency:
            response = TriageResponse(
                triage_level="EMERGENCY",
                emergency=True,
                matched_red_flags=matched_flags,
                reasons=reasons,
                recommended_action="Seek emergency medical care immediately.",
                facility_action="Route patient to the nearest appropriate emergency facility."
            )
        else:
            if not reasons:
                reasons = ["No configured emergency warning signs were detected."]
            response = TriageResponse(
                triage_level="NON_URGENT",
                emergency=False,
                matched_red_flags=[],
                reasons=reasons,
                recommended_action="Continue with normal CareConnect healthcare services and seek medical advice if symptoms persist or worsen.",
                next_step="BOOK_APPOINTMENT"
            )

        # 4. Integrate with DB
        if patient_id:
            try:
                # Log triage history
                triage_history_record = {
                    "patient_id": patient_id,
                    "symptoms": request.symptoms,
                    "severity": request.severity,
                    "duration_days": request.duration_days,
                    "triage_level": response.triage_level,
                    "matched_red_flags": response.matched_red_flags,
                    "reasons": response.reasons,
                    "created_at": datetime.utcnow().isoformat()
                }
                supabase_client.table("triage_history").insert(triage_history_record).execute()

                # Audit logging
                audit_record = {
                    "action": "TRIAGE_PERFORMED",
                    "user_id": patient_id,
                    "patient_id": patient_id,
                    "triage_level": response.triage_level,
                    "timestamp": datetime.utcnow().isoformat()
                }
                supabase_client.table("audit_logs").insert(audit_record).execute()

                # Emergency case creation
                if emergency:
                    emergency_record = {
                        "patient_id": patient_id,
                        "triage_result": response.triage_level,
                        "triage_reason": "; ".join(response.reasons),
                        "red_flags": response.matched_red_flags,
                        "detected_at": datetime.utcnow().isoformat(),
                        "status": "NEW"
                    }
                    supabase_client.table("emergency_cases").insert(emergency_record).execute()
                    
                    # Notifications could be added here
                    notification_record = {
                        "type": "EMERGENCY_ALERT",
                        "patient_id": patient_id,
                        "message": f"Emergency triage generated for patient {patient_id}",
                        "created_at": datetime.utcnow().isoformat()
                    }
                    supabase_client.table("notifications").insert(notification_record).execute()

            except Exception as e:
                print(f"Database integration error: {e}")

        return response

triage_engine = TriageEngine()
