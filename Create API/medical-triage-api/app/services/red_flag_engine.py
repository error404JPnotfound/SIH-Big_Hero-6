import json
from pathlib import Path
from typing import List, Dict, Any, Set

class RedFlagEngine:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent.parent / "seed"
        self.red_flags = self._load_json("red_flags.json")
        self._build_keyword_map()

    def _load_json(self, filename: str) -> list:
        file_path = self.base_dir / filename
        if not file_path.exists():
            return []
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _build_keyword_map(self):
        # We will match either on normalized standard codes or raw keywords if they happen to match directly.
        self.flag_rules = {}
        for flag in self.red_flags:
            self.flag_rules[flag["code"]] = flag

    def evaluate(self, normalized_symptoms: List[str], raw_symptoms: List[str] = None) -> Dict[str, Any]:
        """
        Evaluates a list of normalized symptoms against red flags.
        Returns a dictionary with matched flags and reasons.
        """
        matched_flags = []
        reasons = []

        if raw_symptoms is None:
            raw_symptoms = []

        # Check normalized symptoms
        for symptom in normalized_symptoms:
            if symptom in self.flag_rules:
                rule = self.flag_rules[symptom]
                if rule["code"] not in matched_flags:
                    matched_flags.append(rule["code"])
                    reasons.append(rule["message"])

        # We can also check raw symptoms against keywords just to be thorough if they missed normalization
        for raw_symptom in raw_symptoms:
            raw_lower = raw_symptom.lower().strip()
            for rule in self.red_flags:
                if rule["code"] in matched_flags:
                    continue # already matched
                if raw_lower in [k.lower() for k in rule.get("keywords", [])]:
                    matched_flags.append(rule["code"])
                    reasons.append(rule["message"])

        return {
            "emergency": len(matched_flags) > 0,
            "matched_flags": matched_flags,
            "reasons": reasons
        }

red_flag_engine = RedFlagEngine()
